import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as apn from 'apn';
import * as admin from 'firebase-admin';
import { SessionNotif, SessionNotifValue, TokenPayload, UserTypes } from 'src/common/constants';
import { Tokens } from "src/common/constants/index";
import { Client } from 'src/common/entities/client.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { In, Repository } from 'typeorm';
import { SaveNotificationDto } from './dto/save-notification.dto';

@Injectable()
export class FirebaseService {
  constructor(
    private readonly logger: LoggerService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    @Optional() @Inject('APN_PROVIDER') private readonly apnProvider: apn.Provider,
    @Optional() @Inject('APN_PROVIDER_SECOND') private readonly apnClient: apn.Provider,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,
  ){}


  async markAsRead(queryParams: FindAllQueryParams) {

    // const ids = queryParams?.ids ? queryParams.ids.split(',').map((id) => id.trim()) : [];

    // if (ids.length === 0) {
    //   throw new BadRequestException("No IDs provided for update.");
    // }

    const updateResult = await this.notifRepo.update(
      { isRead: false },  // Filtering by the provided ids
      { isRead: true }  // Updating the status to 'read' (or any other field you need)
    );
  
    return "Records updated successfully";
  }

  async sendPushNotification(
    tokens: Tokens,
    message: string,
    notificationType: SessionNotifValue,
    body?: string,
    profile?: string,
    // voipTokens?: string[]
    voip?: {
      isClient: boolean;
      tokens: string[];
    }

  ): Promise<void> {
    try {
      const { code, title, showNotification } = notificationType;

      console.log({code, title, showNotification})
      if (!body) body = "You have a new notification.";

      this.logger.log(`Preparing push notification: ${title} -> ${message}`);

      // 1️⃣ Flatten all tokens
      const allTokens: string[] = [
        ...(tokens.client || []),
        ...(tokens.therapist || []),
        ...(tokens.admin || []),
      ];
      console.log({allTokens})

      // 2️⃣ Save notification ONCE (only when allowed)
      if (showNotification) {
        // setImmediate(() => {
          this.saveNotification({
            title,
            body,
            message,
            code,
            profile,
            clientTokens: tokens.client,
            therapistTokens: tokens.therapist,
          }).catch(err => this.logger.error('saveNotification failed:', err.message));
        // }
      // );
      }


      // if (!allTokens.length) return;
      if (!allTokens.length && (!voip.tokens || !voip.tokens.length)) return;

      // ==========================================
      // PATH A: INCOMING CALLS (New Logic)
      // ==========================================
      const isCall = (code === SessionNotif.INCOMING_CALL.code) || (code === SessionNotif.INCOMING_GROUP_CALL.code);
 
      if (isCall) {
          if (voip?.tokens && voip.tokens.length > 0) {
            const provider =
              voip.isClient 
                ? this.apnClient
                : this.apnProvider;

            if (!provider) return;

            const note = new apn.Notification();

            note.topic =
              voip.isClient
                ? 'com.abthon.navithera.voip'
                : 'com.abthon.navithera.therapist.voip'

            note.expiry = 0;
            note.priority = 10;
            note.payload = {
              id: message,
              code,
              data: { id: message, code, profile, isVideoCall: true },
            };

            provider.send(note, voip.tokens).then(result => {
              this.logger.log(`VoIP Sent: ${result.sent.length}`);
              if (result.failed.length) {
                console.log('VoIP Failures:', JSON.stringify(result.failed));
              }
            });
          }

      // if (isCall) {
      //   // 1. Send VoIP Push to iOS (if tokens exist)
      //   if (voipTokens && voipTokens.length > 0 && this.apnProvider) {
      //     const note = new apn.Notification();
      //     note.topic = tokens.therapist.length > 0 ? "com.abthon.navithera.therapist.voip": "com.abthon.navithera.voip";
      //     note.expiry = 0;
      //     note.priority = 10;
      //     // note.push
      //     note.payload = {
      //        id: message, // Your call data JSON
      //        code: code,
      //        data: { id: message, code, profile, isVideoCall: true }
      //     };
      //     this.apnProvider.send(note, voipTokens).then((result) => {
      //        this.logger.log(`VoIP Sent: ${result.sent.length}`);
      //        if (result.failed.length) console.log('VoIP Failures:', JSON.stringify(result.failed));
      //     });
      // }
      

      //   // 2. Send Data-Only FCM to Android (and iOS fallback)
      //   // We use a data-only payload so we don't trigger a standard banner on iOS 
      //   // that conflicts with the CallKit UI.
        if (allTokens.length > 0) {
           const callPayload: admin.messaging.MulticastMessage = {
             tokens: allTokens,
             data: {
               id: message,
               code: code.toString(),
               timestamp: Date.now().toString(),
               profile: profile ?? "",
               type: "call"
             },
             android: {
               priority: "high",
               ttl: 0,
               notification: {
                 channelId: "match_requests", // triggers full screen on Android if configured
                 sound: "default"
               }
             },
             // Empty APNS config here to prevent double-banner on iOS
             apns: {
                payload: {
                   aps: { "content-available": 1 }
                }
             }
           };
           this.firebaseAdmin.messaging().sendEachForMulticast(callPayload)
             .catch(err => this.logger.error("FCM Call error:", err));
        }
        
        return; // ✅ Stop here for calls
      }
 
      // ==========================================
      // PATH B: STANDARD NOTIFICATIONS (Your Old Logic)
      // ==========================================
      // This block runs for everything that is NOT a call.
      // It is exactly your previous logic.

      // 3️⃣ Firebase payload (iOS + Android)
      // const firebasePayload: admin.messaging.MulticastMessage = {
      //   tokens: allTokens,
      // ...(showNotification && {
      //   notification: { title, body },
      // }),
      //   data: {
      //     id: message,
      //     code,
      //     timestamp: Date.now().toString(),
      //     profile: profile ?? "",
      //   },
      //   apns: {
      //     headers: {
      //       "apns-push-type": showNotification ? "alert" : "background",
      //       "apns-priority": showNotification ? "10" : "5"
      //     },
      //     payload: {
      //       aps: {
      //         alert: showNotification ? { title, body } : undefined,
      //         ...(!showNotification && {"content-available": 1}),
      //         sound: showNotification ? "default" : undefined,
      //       },
      //     },
      //   },
      //   android: {
      //     priority: "high",
      //     notification: showNotification
      //       ? {
      //           sound: "default",
      //           channelId:
      //             notificationType === SessionNotif.MATCH_REQUEST
      //               ? "match_requests"
      //               : "default"
      //         }
      //       : undefined,
      //   },
      // };
      const isAlert = showNotification === true;
      const firebasePayload: admin.messaging.MulticastMessage = {
      tokens: allTokens,

      ...(isAlert && {
        notification: { title, body },
      }),

      ...(isAlert && {
        data: {
          id: message,
          code,
          timestamp: Date.now().toString(),
          profile: profile ?? "",
        },
      }),

      apns: {
        headers: {
          "apns-push-type": isAlert ? "alert" : "background",
          "apns-priority": isAlert ? "10" : "5",
        },
        payload: {
          aps: isAlert
            ? {
                alert: { title, body },
                sound: "default",
              }
            : {
                "content-available": 1,
              },
        },
      },

      android: {
        priority: "high",
        ...(isAlert
          ? {
              notification: {
                sound: "default",
                channelId:
                  notificationType === SessionNotif.MATCH_REQUEST
                    ? "match_requests"
                    : "default",
              },
            }
          : {
              data: {
                id: message,
                code,
                timestamp: Date.now().toString(),
                profile: profile ?? "",
              },
            }),
      },
    };

    console.log({firebasePayload})
      this.firebaseAdmin
        .messaging()
        .sendEachForMulticast(firebasePayload)
        .catch(err => this.logger.error("Firebase error:", err));

      this.logger.log("Push notification processed successfully");
    } catch (err) {
      this.logger.error("Error sending push notification:", err);
    }
  }

  // async sendPushNotification(
  //   tokens: Tokens,
  //   message: string,
  //   notificationType: SessionNotifValue,
  //   body?: string,
  //   profile?: string
  // ): Promise<void> {
  //   try {
  //     const { code, title, showNotification } = notificationType;

  //     console.log({code, title, showNotification})
  //     if (!body) body = "You have a new notification.";

  //     this.logger.log(`Preparing push notification: ${title} -> ${message}`);

  //     // 1️⃣ Flatten all tokens
  //     const allTokens: string[] = [
  //       ...(tokens.client || []),
  //       ...(tokens.therapist || []),
  //       ...(tokens.admin || []),
  //     ];
  //     console.log({allTokens})
  //     // 2️⃣ Save notification ONCE (only when allowed)
  //     if (showNotification) {
  //       await this.saveNotification({
  //         title,
  //         body,
  //         message,
  //         code,
  //         profile,
  //         clientTokens: tokens.client,
  //         therapistTokens: tokens.therapist,
  //       });
  //     }

  //     if (!allTokens.length) return;

  //     // 3️⃣ Firebase payload (iOS + Android)
  //     const firebasePayload: admin.messaging.MulticastMessage = {
  //       // tokens: ['dUeVsftmP03xn56LIUXOtd:APA91bElHEj-Gw2vHy2iOx_oxTv2EtJniwtnDK1QU6kMk3R_in0HY0XSMJOToVlrBLgpn9pD_0HBpea0kEV3_316j7YxnP7UyLI-vG5eVQ8cWKMIhvJmtA8'],
  //       tokens: allTokens,

  //       notification: showNotification
  //         ? { title, body }
  //         : undefined,

  //     ...(!showNotification && {
  //         data: {
  //           id: message,
  //           code,
  //           timestamp: Date.now().toString(),
  //           profile: profile ?? "",
  //         },
  //       }),

  //       apns: {
  //         headers: {
  //           "apns-priority": showNotification ? "10" : "5",
  //           "apns-push-type": showNotification ? "alert" : "background",
  //         },
  //         payload: {
  //           aps: showNotification
  //             ? {
  //                 alert: { title, body },
  //                 sound: "default",
  //               }
  //             : {
  //                 "content-available": 1,
  //               },
  //         },
  //       },
  //       android: {
  //             priority: "high",
  //             ...(showNotification
  //               ? {
  //                   notification: {
  //                     sound: "default",
  //                     channelId:
  //                       notificationType === SessionNotif.MATCH_REQUEST
  //                         ? "match_requests"
  //                         : "default",
  //                   },
  //                 }
  //               : {
  //                   data: {
  //                     id: message,
  //                     code,
  //                     timestamp: Date.now().toString(),
  //                     profile: profile ?? "",
  //                   },
  //                 }),
  //       },

  //     };

  //     console.log({firebasePayload})
  //     this.firebaseAdmin
  //       .messaging()
  //       .sendEachForMulticast(firebasePayload)
  //       .catch(err => this.logger.error("Firebase error:", err));

  //   //   this.logger.log("Push notification processed successfully");
  //   //   const firebasePayload: admin.messaging.MulticastMessage  = {
  //   //     tokens: [`dUeVsftmP03xn56LIUXOtd:APA91bElHEj-Gw2vHy2iOx_oxTv2EtJniwtnDK1QU6kMk3R_in0HY0XSMJOToVlrBLgpn9pD_0HBpea0kEV3_316j7YxnP7UyLI-vG5eVQ8cWKMIhvJmtA8`],
  //   //     // "to": "YOUR_DEVICE_FCM_TOKEN_OR_TOPIC",
  //   //     "notification": {
  //   //       "title": "Hello from Backend",
  //   //       "body": "This is a notification from your server."
  //   //     },
  //   //     "data": {
  //   //       "key1": "value1",
  //   //       "key2": "value2"
  //   //     },
  //   //     "apns": {
  //   //       "headers": {
  //   //         "apns-priority": "10",
  //   //         "apns-topic": "com.abthon.navithera" // e.g., "com.abthon.navithera"
  //   //       },
  //   //       "payload": {
  //   //         "aps": {
  //   //           "alert": {
  //   //             "title": "Hello from APNs",
  //   //             "body": "This is an APNs-specific alert message."
  //   //           },
  //   //           "sound": "default",
  //   //           "badge": 1,
  //   //           "mutable-content": 1 // For rich notifications
  //   //         },
  //   //         "customDataField": "some custom value" // Any custom data you want to send via APNs payload
  //   //       }
  //   //     }

        
  //   //     }
  //   //     console.log({firebasePayload})
  //   //   this.firebaseAdmin
  //   // .messaging()
  //   // .sendEachForMulticast(firebasePayload)
  //   // .catch(err => this.logger.error("Firebase error:", err));
         
  //     // }
  // } catch (err) {
  //     this.logger.error("Error sending push notification:", err);
  //   }
  // }

//  async sendPushNotification(
//   tokens: Tokens,
//   message: string,
//   notificationType: SessionNotifValue,
//   body?: string,
//   profile?: string
//   ): Promise<void> {
//     try {
//       const { code, title, showNotification } = notificationType;
//       if (!body) body = "You have a new notification.";

//       this.logger.log(`Preparing push notification: ${title} -> ${message}`);

//       // 1️⃣ Flatten all tokens for Firebase
//       const allTokens: string[] = [
//         ...(tokens.client || []),
//         ...(tokens.therapist || []),
//         ...(tokens.admin || []),
//       ];

//       // 2️⃣ Create notifications in memory
//       const notifications: Notification[] = [];

//       if (showNotification) {
//         // Fetch clients in one query
//         await this.saveNotification({ title, body, message, code, clientTokens: tokens.client });
//         await this.saveNotification({ title, body, message, code, therapistTokens: tokens.therapist });

//         const clients = tokens.client?.length
//           ? await this.clientRepo.find({
//               where: { firebaseToken: In(tokens.client) },
//             })
//           : [];

//         // Fetch therapists in one query
//         const therapists = tokens.therapist?.length
//           ? await this.therapistRepo.find({
//               where: { firebaseToken: In(tokens.therapist) },
//             })
//           : [];

//         // Prepare notifications
//         notifications.push(
//           ...clients.map((client) =>
//             this.notifRepo.create({
//               title,
//               body,
//               message,
//               code,
//               profile,
//               client: { id: client.id },
//               therapist: null,
//             })
//           ),
//           ...therapists.map((therapist) =>
//             this.notifRepo.create({
//               title,
//               body,
//               message,
//               code,
//               profile,
//               client: null,
//               therapist: { id: therapist.id },
//             })
//           )
//         );

//         // 3️⃣ Save notifications in batches to avoid locks
//         const batchSize = 50;
//         for (let i = 0; i < notifications.length; i += batchSize) {
//           const batch = notifications.slice(i, i + batchSize);
//           await this.notifRepo.save(batch);
//         }
//       }

//       // 4️⃣ Send Firebase notifications asynchronously (non-blocking)
//       if (allTokens.length > 0) {
//         const firebasePayload: any = {
//           tokens: allTokens,
//           notification: showNotification ? { title, body } : undefined,
//           data: {
//             id: message,
//             code,
//             timestamp: Date.now().toString(),
//             profile: profile || "",
//           },
//         };

//         let android, apns;
//         if (notificationType === SessionNotif.MATCH_REQUEST) {
//           android = { notification: { sound: "positive", channel_id: "match_requests" } };
//           apns = { payload: { aps: { sound: "positive" } } };
//         }

//         if (android) firebasePayload.android = android;
//         if (apns) firebasePayload.apns = apns;

//         this.firebaseAdmin.messaging()
//           .sendEachForMulticast(firebasePayload)
//           .catch((err) => this.logger.error('Firebase error:', err));
//       }

//       this.logger.log(`Notifications processed successfully`);
//     } catch (err) {
//       this.logger.error('Error sending notification:', err);
//     }
//   }

  async saveNotification(dto: SaveNotificationDto) {
    const { body, code, message, title, clientTokens, therapistTokens, profile } = dto;

    // Fetch users in one query each
    const clients = clientTokens?.length
      ? await this.clientRepo.find({ where: { firebaseToken: In(clientTokens) } })
      : [];
    const therapists = therapistTokens?.length
      ? await this.therapistRepo.find({ where: { firebaseToken: In(therapistTokens) } })
      : [];

    // Create notifications in memory
    const notifications = [
      ...clients.map(c =>
        this.notifRepo.create({
          title,
          body,
          message,
          code,
          profile,
          client: { id: c.id },
          therapist: null,
        })
      ),
      ...therapists.map(t =>
        this.notifRepo.create({
          title,
          body,
          message,
          code,
          profile,
          client: null,
          therapist: { id: t.id },
        })
      ),
    ];
    
    if (notifications.length === 0) return;


    let saved = await this.notifRepo.save(notifications);
    if ((code === SessionNotif.SCHEDULED.code) && notifications[0]?.client?.id) {


      const clientNotification = saved.find(n => n.client?.id);
      if (clientNotification) {
        await this.clientRepo.update(clientNotification.client.id, {
          hasNotification: clientNotification,
        });
      }

      return;
    }

    // Batch insert asynchronously (outside any active session transaction)
    // const batchSize = 20;
    // for (let i = 0; i < notifications.length; i += batchSize) {
    //   const batch = notifications.slice(i, i + batchSize);
    //   this.notifRepo.save(batch).catch(err => {
    //     this.logger.error('Error saving notification batch:', err);
    //   });
    // }
    // console.log("===========================================================================")
    // Update client.hasNotification outside transaction (fire-and-forget)
    // clients.forEach(c => {
    //   const notif = notifications.find(n => n.client?.id === c.id);
    //   if (!notif) return;

    //   this.clientRepo
    //     .createQueryBuilder()
    //     .relation(Client, "hasNotification")
    //     .of(c.id)
    //     .set(notif.id)
    //     .catch(err => this.logger.error('Error updating client.hasNotification:', err));
    // });

    // clients.forEach(c => {
    //     this.clientRepo.save({
    //       id: c.id,
    //       hasNotification: notifications.find(n => n.client?.id === c.id)
    //     }).catch(err => this.logger.error('Error updating client.hasNotification:', err));
    // });
    // console.log({clients});
      // console.log("===========================================================================")

  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Notification>) {
      try {
        this.logger.log(`Finding notification with ID: ${id}`);
        const notification = await new APIFeatures(this.notifRepo, queryParams).getOne(id);
  
        if (!notification) {
          this.logger.warn(`NOtification not found with ID: ${id}`);
          throw new NotFoundException('Notification not found');
        }
  
        this.logger.log(`Client found with ID: ${id}`);
        return notification;
      } catch (error) {
        this.logger.error(`Error finding client: ${error.message}`);
        throw error;
      }
    }

  async findAll(queryParams?: FindAllQueryParams<Notification>, user?: TokenPayload) {
      try {
        this.logger.log(`Fetching all notification`);
        const result = await new APIFeatures(this.notifRepo, queryParams).getMany();
            // Count unread notifications for this user
    const unreadCount = await this.notifRepo.count({
      where: {
        isRead: false,
        ...(user?.type === UserTypes.CLIENT
          ? { client: { id: user.id } }
          : { therapist: { id: user.id } }),
      },
    });

    this.logger.log(`Found ${result.data.length} notification`);
    return { ...result, unreadCount };

        this.logger.log(`Found ${result.data.length} notification`);
        return result;
      } catch (error) {
        this.logger.error(`Error fetching notification: ${error.message}`);
        throw error;
      }
    }
}
