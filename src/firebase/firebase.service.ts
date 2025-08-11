import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SessionNotifValue } from 'src/common/constants';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    private readonly logger: LoggerService
  ){}

  async sendPushNotification(tokens: string[], message: string, notificationType: SessionNotifValue, body): Promise<void> {
    try {
        const { code, title} = notificationType
      this.logger.log(`Sending push notification with title: ${title} and message: ${message} to tokens: ${tokens}`);
      try{
        if(!body) body = "place holder"
        await this.firebaseAdmin.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title,
                body,
            },
            data: {
                id: message,
                code,
                timestamp: Date.now().toString()
            }
        }).catch((err)=>{
      })
    }
    catch(err){
      console.log({err})
    }

      this.logger.log(`Notifications sent successfully to tokens: ${tokens}`);
    } catch (error) {
      this.logger.error('Error sending notification:', error);
    }
  }
}
