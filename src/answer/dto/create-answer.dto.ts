import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateIndividualAnswerDto } from './create-individual-answer.dto';

export class CreateAnswerDto {
  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24',
    description: 'UUID of the modality (e.g., therapist specialization)',
  })
  @IsNotEmpty()
  @IsUUID()
  modalId: string;

  @ApiProperty({
    description: 'Array of answers to questions',
    type: [CreateIndividualAnswerDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIndividualAnswerDto)
  answers: CreateIndividualAnswerDto[];
}