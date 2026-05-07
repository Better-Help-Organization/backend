import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/common/entities/session.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ReminderProcessor } from './reminder.processor';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    BullModule.registerQueue({
      name: 'session-reminders',
    }),
    FirebaseModule,
  ],
  providers: [ReminderProcessor, ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}