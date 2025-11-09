import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateModalDto {
  @ApiProperty({
    description: 'Name of the therapy type (modal)',
    example: 'Individual Therapy',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Order to display the modal',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  order: number;
  
  @ApiProperty({
    description: 'Order to display the modal',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  code: number;

  @ApiProperty({
    description: 'Description of the therapy type',
    example: 'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}