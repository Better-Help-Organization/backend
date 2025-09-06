import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as admin from 'firebase-admin';
import { SessionNotifValue } from 'src/common/constants';
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

  async sendPushNotification(tokens: Tokens, message: string, notificationType: SessionNotifValue, body ): Promise<void> {
    try {
      const { code, title, showNotification } = notificationType
      this.logger.log(`Sending push notification with title: ${title} and message: ${message} to tokens: ${tokens}`);
      if(!body) body = "Place Holder"

      try{
        let notification = undefined
        
        if (showNotification) {
          notification = { title, body }

        // Handle client tokens
        await this.saveNotification({ title,body, message, code, clientTokens:tokens.client,therapistTokens: null }).catch((err)=>{
          console.log({err})
        });
      // Handle therapist tokens
        await this.saveNotification({ title,body, message, code, clientTokens: null,therapistTokens:tokens.therapist }).catch((err)=>{
          console.log({err})
        });
        
        this.logger.log(`Notifications processed successfully`);
        
      }

        // Flatten all tokens into one array for Firebase
        const allTokens = [
          ...tokens.client || '',
          ...tokens.therapist || '',
          ...tokens.admin || '',
        ];
        
        await this.firebaseAdmin.messaging().sendEachForMulticast({
            tokens: allTokens,
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
        
        const {body, code, message, title, clientTokens, therapistTokens} = dto
        // Fetch all clients in one query
        const clients = clientTokens?.length > 0
          ? await this.clientRepo.find({ where: { firebaseToken: In(clientTokens) } })
          : [];

        // Fetch all therapists in one query
        const therapists = therapistTokens?.length > 0
          ? await this.therapistRepo.find({ where: { firebaseToken: In(therapistTokens) } })
          : [];

        // Create notifications in memory
        const notifications = [
          ...clients.map(client => this.notifRepo.create({
            title,
            body,
            message,
            code,
            client: client,
            therapist: null,
          })),
          ...therapists.map(therapist => this.notifRepo.create({
            title,
            body,
            message: JSON.parse(message),
            code,
            client: null,
            therapist: therapist,
          })),
        ];

        if (notifications.length > 0) {
          await this.notifRepo.save(notifications);
        }

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

    async findAll(queryParams?: FindAllQueryParams<Notification>) {
      try {
        this.logger.log(`Fetching all notification`);
        const result = await new APIFeatures(this.notifRepo, queryParams).getMany();
        this.logger.log(`Found ${result.data.length} notification`);
        return result;
      } catch (error) {
        this.logger.error(`Error fetching notification: ${error.message}`);
        throw error;
      }
    }
}
