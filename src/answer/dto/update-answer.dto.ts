import { IsUUID, IsOptional, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UpdateIndividualAnswerDto } from './update-individual-answer.dto';

export class UpdateAnswerDto {
  @ApiProperty({
    description: 'Array of answers to questions',
    type: [UpdateIndividualAnswerDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateIndividualAnswerDto)
  answers: UpdateIndividualAnswerDto[];
}