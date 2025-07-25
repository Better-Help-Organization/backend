import { IsNotEmpty, IsString } from 'class-validator';
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
    description: 'Description of the therapy type',
    example:
      'For individuals seeking one-on-one support to manage personal challenges and improve mental well-being.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}
