import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../common/constants/index';

export class UpdatePaymentDto {
  @ApiProperty({ description: 'Payment amount', example: 499.99, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'amount must be a positive number' })
  amount?: number;

  @ApiProperty({ description: 'Date and time of payment', example: '2025-09-18T14:32:00Z', required: false })
  @IsOptional()
  @IsDateString()
  date?: Date;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used', example: PaymentMethod.BANK_TRANSFER, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiProperty({ description: 'Receipt URL or reference', example: 'https://payments.example.com/receipt/12345', required: false })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24.pdf',
    description: 'File name of the uploaded payment',
    required: false 
  })
  @IsOptional()
  @IsString()
  filename: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status', example: PaymentStatus.ACCEPTED, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}