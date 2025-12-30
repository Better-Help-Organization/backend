import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    profile?: string
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
        await this.saveNotification({
          title,
          body,
          message,
          code,
          profile,
          clientTokens: tokens.client,
          therapistTokens: tokens.therapist,
        });
      }

      if (!allTokens.length) return;

      // 3️⃣ Firebase payload (iOS + Android)
      const firebasePayload: admin.messaging.MulticastMessage = {
        tokens: allTokens,

        notification: showNotification
          ? { title, body }
          : undefined,

        data: {
          id: message,
          code,
          timestamp: Date.now().toString(),
          profile: profile ?? "",
        },

        apns: {
          headers: {
            "apns-priority": showNotification ? "10" : "5",
          },
          payload: {
            aps: {
              alert: showNotification ? { title, body } : undefined,
              "content-available": 1,
              sound: showNotification ? "default" : undefined,
            },
          },
        },

        android: {
          priority: "high",
          notification: showNotification
            ? {
                sound: "default",
                channelId:
                  notificationType === SessionNotif.MATCH_REQUEST
                    ? "match_requests"
                    : "default",
              }
            : undefined,
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
