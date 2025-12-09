import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateTherapistPaymentPeriodDto {
  @ApiProperty()
  @IsUUID()
  therapist: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsString()
  endDate: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  totalRevenue: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('all', { each: true })
  sessionIds: string[];
}
