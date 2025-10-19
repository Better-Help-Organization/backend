import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';
import { SubscriptionType } from 'src/common/constants';
import { IsFutureDateOrDateTime } from 'src/common/validators/is-future-date.validator';

export class CreateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionType, description: 'Type of subscription like 0 = trial, 1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = yearly', example: SubscriptionType.MONTHLY })
  @IsNotEmpty()
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({ description: 'Start date of subscription', example: '2025-08-28' })
  @IsNotEmpty()
  @IsDateString()
  @IsFutureDateOrDateTime({ message: 'Subscription must be in the future' })
  start_date: Date;

  @ApiProperty({ description: 'Original price before discount', example: 580 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'old_price must be a positive number' })
  old_price: number;

  @ApiProperty({ description: 'Discounted price if applicable', example: 499, required: false })
  @IsOptional() 
  @IsInt()
  @Min(0, { message: 'price must be a positive number' })
  price?: number;

  @ApiProperty({ description: 'Associated therapist level ID', example: 'e48dbdc4-2152-45ef-91b8-4b76d0025b41' })
  @IsNotEmpty()
  @IsUUID()
  levelId: string;
}
