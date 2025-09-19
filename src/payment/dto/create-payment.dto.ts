import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../common/constants/index';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Associated subscription ID', example: 'a37dbbc4-2152-45ef-91b8-4b76d0025b41' })
  @IsNotEmpty()
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ description: 'Payment amount', example: 499.99 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'amount must be a positive number' })
  amount: number;

  @ApiProperty({ description: 'Date and time of payment', example: '2025-09-18T14:32:00Z', required: false })
  @IsOptional()
  @IsDateString()
  date?: Date;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used', example: PaymentMethod.BANK_TRANSFER })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Receipt URL or reference', example: 'https://payments.example.com/receipt/12345', required: false })
  @IsOptional()
  @IsString()
  receipt?: string;

  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24.pdf',
    description: 'File name of the uploaded payment',
  })
  @IsNotEmpty()
  @IsString()
  filename: string;
}