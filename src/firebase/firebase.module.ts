import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as apn from 'apn'; // Make sure to run: npm install apn
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { Client } from 'src/common/entities/client.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseService } from './firebase.service';

dotenv.config();
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env variable is not set');
}

const serviceAccount = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

@Module({
  imports:[
    TypeOrmModule.forFeature([Notification, Client, Therapist])
  ],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        return admin;
      },
    },
    {
      provide: 'APN_PROVIDER',
      useFactory: () => {
        // Only initialize if keys are present to prevent crashes in dev
        if (process.env.APN_KEY_PATH && process.env.APN_KEY_ID && process.env.APN_TEAM_ID) {
          try {
            return new apn.Provider({
              token: {
                key: path.resolve(__dirname, process.env.APN_KEY_PATH),
                keyId: process.env.APN_KEY_ID,
                teamId: process.env.APN_TEAM_ID,
              },
              production: true,
            });
          } catch (error) {
            console.error('Failed to initialize APN Provider:', error);
            return null;
          }
        }
        return null; 
      },
    },
    FirebaseService,
    JwtService
  ],
  exports: ['APN_PROVIDER','FIREBASE_ADMIN', FirebaseService],
})
export class FirebaseModule {}
