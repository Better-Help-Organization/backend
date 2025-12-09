import { Test, TestingModule } from '@nestjs/testing';
import { TherapistPaymentPeriodService } from './therapist-payment-period.service';

describe('TherapistPaymentPeriodService', () => {
  let service: TherapistPaymentPeriodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TherapistPaymentPeriodService],
    }).compile();

    service = module.get<TherapistPaymentPeriodService>(TherapistPaymentPeriodService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
