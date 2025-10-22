import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Level } from 'src/common/entities/level.entity';
import { Match } from 'src/common/entities/match.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ModalService } from 'src/modal/modal.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminStatisticsService } from './admin.stats';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin, Client, Therapist, Session,
      Subscription, Match, Mood, Diary, Modal, ClientSubscription, Level, Preference,
      Notification, Therapist]),
      FirebaseModule,
  ],  
  controllers: [AdminController],
  providers: [AdminService, AdminStatisticsService, ModalService, SubscriptionService],
  exports: [AdminService, AdminStatisticsService],
})
export class AdminModule {}
