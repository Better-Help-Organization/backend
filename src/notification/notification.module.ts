import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LoggerModule } from 'src/logger/logger.module';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Diary, Mood, Note, Session, Subscription, Therapist]),
    FirebaseModule,
    LoggerModule
  ],
  providers: [
    NotificationScheduler
  ],
  exports: [NotificationScheduler]
})
export class NotificationModule {}
