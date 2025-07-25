import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateModalDto {
  @ApiProperty({
    description: 'Name of the therapy type (modal)',
    example: 'Individual Therapy',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the therapy type',
    example: 'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}