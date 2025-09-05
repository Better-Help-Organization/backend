import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { SessionNotifValue } from 'src/common/constants';
import { Notification } from 'src/common/entities/notification.entity';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { SaveNotificationDto } from './dto/save-notification.dto';


@Injectable()
export class FirebaseService {
  constructor(
      private readonly jwtService: JwtService,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly logger: LoggerService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ){}

  async sendPushNotification(tokens: string[], message: string, notificationType: SessionNotifValue, body ): Promise<void> {
    try {
        const { code, title, showNotification } = notificationType
      this.logger.log(`Sending push notification with title: ${title} and message: ${message} to tokens: ${tokens}`);
      if(!body) body = "Place Holder"

      try{
        let notification = undefined
        
        if (showNotification) {
          notification = { title, body }
          for (const token of tokens) {
            let clientId: string | undefined;
            let therapistId: string | undefined;

            try {
              const decoded: any = this.jwtService.decode(token); // decode without verifying signature
              if (!decoded) continue;

              // Example: token contains type and id
              if (decoded.type === 'client') clientId = decoded.sub;
              else if (decoded.type === 'therapist') therapistId = decoded.sub;

              await this.saveNotification({ title, body, message, code, clientId, therapistId });
            } catch (err) {
              this.logger.error('Failed to decode token', err);
            }
          }

      this.logger.log(`Notifications processed successfully`);

          // this.saveNotification({...notification, message, code}).catch((err)=>{});
        }

        await this.firebaseAdmin.messaging().sendEachForMulticast({
            tokens,
            notification,
            data: {
                id: message,
                code,
                timestamp: Date.now().toString()
            }
        }).catch((err)=>{})
    }
    catch(err){
      console.log({err})
    }

      this.logger.log(`Notifications sent successfully to tokens: ${tokens}`);
    } catch (error) {
      this.logger.error('Error sending notification:', error);
    }
  }

    async saveNotification(dto: SaveNotificationDto) {

    const notification = this.notifRepo.create({
        title: dto.title,
        body: dto.body,
        message: dto.message,
        code: dto.code,
        client: dto.clientId ? ({ id: dto.clientId } as any) : null,
        therapist: dto.therapistId ? ({ id: dto.therapistId } as any) : null,
      });

      await this.notifRepo.save(notification);
  }

}
