import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LoggerModule } from 'src/logger/logger.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Level, Subscription, ClientSubscription]),
    LoggerModule,
    FirebaseModule
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService]
})
export class SubscriptionModule {}
