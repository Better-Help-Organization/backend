import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { TelebirrController } from './telebirr.controller';
import { TelebirrService } from './telebirr.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Payment, ClientSubscription]),
  ],
  controllers: [TelebirrController],
  providers: [TelebirrService],
})
export class TelebirrModule {}
