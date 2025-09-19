import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { LoggerModule } from 'src/logger/logger.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Payment, Subscription]),
    LoggerModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {}
