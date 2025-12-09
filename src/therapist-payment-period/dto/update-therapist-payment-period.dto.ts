import { PartialType } from '@nestjs/swagger';
import { CreateTherapistPaymentPeriodDto } from './create-therapist-payment-period.dto';

export class UpdateTherapistPaymentPeriodDto extends PartialType(CreateTherapistPaymentPeriodDto) {}
