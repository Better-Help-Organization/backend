import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModalDto {
  @ApiProperty({
    description: 'Name of the therapy type (modal)',
    example: 'Individual Therapy',
  })
  @IsNotEmpty()
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
    description: 'Description of the therapy type',
    example:
      'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}
