import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt } from 'class-validator';
import { IsFutureDateOrDateTime } from 'src/common/validators/is-future-date.validator';

export class CreateIndividualAvailabilityDto {
  @ApiProperty({
    description: 'Scheduled start date and time of the session',
    example: '2025-08-12T14:30:00Z',
  })
  @IsDateString()
  @IsFutureDateOrDateTime({ message: 'Session must be in the future' })
  schedule: Date;    

  @ApiProperty({
    description: 'Duration of the session in minutes',
    example: 60,
  })
  @IsInt()
  duration: number;
}