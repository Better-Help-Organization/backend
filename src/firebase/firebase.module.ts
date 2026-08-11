import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as apn from 'apn'; // Make sure to run: npm install apn
import * as admin from 'firebase-admin';
import * as path from 'path';
import { Client } from 'src/common/entities/client.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseService } from './firebase.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([Notification, Client, Therapist])
  ],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const serviceAccountPath = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
        if (!serviceAccountPath) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env variable is not set');
        }

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(path.resolve(__dirname, serviceAccountPath)),
          });
        }
        return admin;
      },
    },
    {
      provide: 'APN_PROVIDER',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Only initialize if keys are present to prevent crashes in dev
        const apnKeyPath = configService.get<string>('APN_KEY_PATH');
        const apnKeyId = configService.get<string>('APN_KEY_ID');
        const apnTeamId = configService.get<string>('APN_TEAM_ID');

        if (apnKeyPath && apnKeyId && apnTeamId) {
          try {
            return new apn.Provider({
              token: {
                key: path.resolve(__dirname, apnKeyPath),
                keyId: apnKeyId,
                teamId: apnTeamId,
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
    {
      provide: 'APN_PROVIDER_SECOND',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const apn2KeyPath = configService.get<string>('APN2_KEY_PATH');
        const apn2KeyId = configService.get<string>('APN2_KEY_ID');
        const apnTeamId = configService.get<string>('APN_TEAM_ID');

        if (apn2KeyPath && apn2KeyId && apnTeamId) {
          return new apn.Provider({
            token: {
              key: path.resolve(__dirname, apn2KeyPath),
              keyId: apn2KeyId,
              teamId: apnTeamId,
            },
            production: true,
          });
        }
        return null;
      },
    },
    FirebaseService,
    JwtService
  ],
  exports: ['APN_PROVIDER_SECOND','APN_PROVIDER','FIREBASE_ADMIN', FirebaseService],
})
export class FirebaseModule {}
