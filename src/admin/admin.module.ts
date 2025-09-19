import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Match } from 'src/common/entities/match.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminStatisticsService } from './admin.stats';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin, Client, Therapist, Session,
      Subscription, Match, Mood, Diary ])
  ],  
  controllers: [AdminController],
  providers: [AdminService, AdminStatisticsService],
  exports: [AdminService, AdminStatisticsService],
})
export class AdminModule {}
