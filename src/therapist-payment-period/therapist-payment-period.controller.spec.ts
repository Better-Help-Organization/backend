import { Test, TestingModule } from '@nestjs/testing';
import { TherapistPaymentPeriodController } from './therapist-payment-period.controller';
import { TherapistPaymentPeriodService } from './therapist-payment-period.service';

describe('TherapistPaymentPeriodController', () => {
  let controller: TherapistPaymentPeriodController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TherapistPaymentPeriodController],
      providers: [TherapistPaymentPeriodService],
    }).compile();

    controller = module.get<TherapistPaymentPeriodController>(TherapistPaymentPeriodController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
