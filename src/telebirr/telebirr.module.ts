import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TelebirrController } from './telebirr.controller';
import { TelebirrService } from './telebirr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, ClientSubscription]),
    HttpModule.register({
      timeout: 15000,
    }),
    SubscriptionModule,
  ],
  controllers: [TelebirrController],
  providers: [TelebirrService],
})
export class TelebirrModule {}
