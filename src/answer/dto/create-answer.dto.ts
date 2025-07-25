import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateIndividualAnswerDto } from './create-individual-answer.dto';

export class CreateAnswerDto {
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