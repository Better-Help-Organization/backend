import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';
import { Session } from 'src/common/entities/session.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ParameterModule } from 'src/parameter/parameter.module';
import { ReminderProcessor } from './reminder.processor';
import {
  SESSION_LIFECYCLE_QUEUE,
  SESSION_REMINDERS_QUEUE,
} from './reminder.constants';
import { ReminderService } from './reminder.service';
import { SessionLifecycleProcessor } from './session-lifecycle.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Client]),
    BullModule.registerQueue({
      name: SESSION_REMINDERS_QUEUE,
    }),
    BullModule.registerQueue({
      name: SESSION_LIFECYCLE_QUEUE,
    }),
    FirebaseModule,
    ParameterModule,
  ],
  providers: [ReminderProcessor, SessionLifecycleProcessor, ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
