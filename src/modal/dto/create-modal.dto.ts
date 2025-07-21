import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModalDto {
  @ApiProperty({
    description: 'Name of the therapy type (modal)',
    example: 'Cognitive Behavioral Therapy',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the therapy type',
    example:
      'A short-term, goal-oriented psychotherapy treatment that takes a hands-on, practical approach to problem-solving.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}
