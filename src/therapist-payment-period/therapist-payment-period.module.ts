import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/common/entities/session.entity';
import { TherapistPaymentPeriod } from 'src/common/entities/therapist-payment-period.entity';
import { TherapistPaymentPeriodSubscriber } from 'src/common/entities/therapist-payment-period.entity.subscriber';
import { Therapist } from 'src/common/entities/therapist.entity';
import { TherapistPaymentPeriodController } from './therapist-payment-period.controller';
import { TherapistPaymentPeriodService } from './therapist-payment-period.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([
      Therapist,
      Session,
      TherapistPaymentPeriod,
      TherapistPaymentPeriodSubscriber
  ]),
],
  controllers: [TherapistPaymentPeriodController],
  providers: [TherapistPaymentPeriodService],
  exports:[TherapistPaymentPeriodService]
})
export class TherapistPaymentPeriodModule {}
