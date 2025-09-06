import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    FirebaseService,
    JwtService
  ],
  exports: ['FIREBASE_ADMIN', FirebaseService],
})
export class FirebaseModule {}
