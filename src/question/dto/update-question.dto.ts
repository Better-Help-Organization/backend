import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from 'src/common/constants';

export class UpdateQuestionDto {
  @ApiProperty({
    description: 'The text of the question',
    example: 'Do you have any prior therapy experience?',
  })
  @IsOptional()
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Type of question (e.g., multiple, single or open)',
    example: 'multiple',
  })
  @IsOptional()
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'UUID of the therapy type (modal) this question belongs to',
    example: 'e4b1bc56-924f-4fc7-8b2f-8d49a3ccf42b',
  })
  @IsOptional()
  @IsUUID()
  modalId: string;
}
