import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Rating } from 'src/common/entities/rating.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { DiaryModule } from 'src/diary/diary.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { MatchModule } from 'src/match/match.module';
import { ModalModule } from 'src/modal/modal.module';
import { MoodModule } from 'src/mood/mood.module';
import { PresenceModule } from 'src/presence/presence.module';
import { SessionModule } from 'src/session/session.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientStatisticsService } from './client.stats';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Mood, Diary, Rating, Subscription]),
    ChatModule,
    SessionModule,
    ModalModule,
    FirebaseModule,
    DiaryModule,
    SubscriptionModule,
    forwardRef(() => ChatModule),
    forwardRef(() => SessionModule),
    forwardRef(() => MoodModule),
    forwardRef(() => MatchModule),
    PresenceModule
  ],  
  controllers: [ClientController],
  providers: [ClientService, ClientStatisticsService],
  exports: [ClientService, ClientStatisticsService]
})
export class ClientModule {}
