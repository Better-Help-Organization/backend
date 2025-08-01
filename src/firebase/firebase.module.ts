import * as dotenv from 'dotenv';
import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { FirebaseService } from './firebase.service';

dotenv.config();
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH env variable is not set');
}

const serviceAccount = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

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
