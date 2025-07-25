import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { FirebaseService } from './firebase.service';

const serviceAccount = path.resolve(__dirname, '../../../src/config/navi-care-b7a15-firebase-adminsdk-fbsvc-94c2bd0cd8.json');

@Module({
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
  ],
  exports: ['FIREBASE_ADMIN', FirebaseService],
})
export class FirebaseModule {}
