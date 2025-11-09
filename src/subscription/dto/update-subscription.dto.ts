import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { SubscriptionStatus, SubscriptionType } from 'src/common/constants';
import { IsFutureDateOrDateTime } from 'src/common/validators/is-future-date.validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'ID of the client', example: '9f8a3d22-4a78-4a29-b6c1-8398f1844d9e' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ enum: SubscriptionType, description: 'Type of subscription like 0 = trial, 1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = yearly', example: SubscriptionType.MONTHLY })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiProperty({ enum: SubscriptionStatus, description: 'Current status', example: SubscriptionStatus.PENDING })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ description: 'Start date of subscription', example: '2025-08-28' })
  @IsOptional()
  @IsDateString()
  @IsFutureDateOrDateTime({ message: 'Subscription must be in the future' })
  start_date?: Date;
  
  
  @ApiProperty({ description: 'Start date of subscription', example: '2025-08-28' })
  @IsOptional()
  @IsDateString()
  @IsFutureDateOrDateTime({ message: 'Subscription must be in the future' })
  end_date?: Date;

  @ApiProperty({ description: 'Original price before discount', example: 580 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'old_price must be a positive number' })
  old_price?: number;

  @ApiProperty({ description: 'Discounted price if applicable', example: 499, required: false })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'price must be a positive number' })
  price?: number;

  @ApiProperty({ description: 'Associated therapist level ID', example: 'e48dbdc4-2152-45ef-91b8-4b76d0025b41' })
  @IsOptional()
  @IsUUID()
  level?: string;
}

// import { ApiProperty } from '@nestjs/swagger';
// import { IsEnum, IsInt, IsOptional, IsBoolean, IsUUID, Min } from 'class-validator';
// import { SubscriptionType } from '../enums/subscription-type.enum';

export class UpdateAdminSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionType,
    description: 'Type of subscription: 0 = trial, 1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = yearly',
    required: false,
  })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiProperty({
    example: 580,
    description: 'Original (old) price before discount',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  old_price?: number;

  @ApiProperty({
    example: 499,
    description: 'Current discounted price',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  // @ApiProperty({
  //   example: false,
  //   description: 'Indicates if this subscription was created by an admin',
  //   required: false,
  // })
  // @IsOptional()
  // @IsBoolean()
  // is_admin_created?: boolean;

  @ApiProperty({
    example: 'b1a7e2d0-59d1-4ef6-8d6f-0a99c81f7a12',
    description: 'UUID of the associated therapy modal',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  modal?: string;

  @ApiProperty({
    example: '1f9b4e2d-3a5f-4e8f-97c1-6b8f6c2e8f0b',
    description: 'UUID of the associated therapist level',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  level?: string;
}

