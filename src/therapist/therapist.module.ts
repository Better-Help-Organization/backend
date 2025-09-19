import { forwardRef, Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { License } from 'src/common/entities/license.entity';
import { Session } from 'src/common/entities/session.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ModalModule } from 'src/modal/modal.module';
import { PresenceModule } from 'src/presence/presence.module';
import { SessionModule } from 'src/session/session.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TherapistController } from './therapist.controller';
import { TherapistService } from './therapist.service';
import { TherapistStatisticsService } from './therapist.stats';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Therapist, 
      License,
      Session
    ]),
    forwardRef(() => PresenceModule),
    forwardRef(() => ChatModule),
    ModalModule,
    SubscriptionModule,
    LoggerModule,
    SessionModule,
    FirebaseModule
  ],  
  controllers: [TherapistController],
  providers: [TherapistService, TherapistStatisticsService],
  exports: [TherapistService, TherapistStatisticsService],
})
export class TherapistModule {}
