import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuestionDto {
  @ApiProperty({
    description: 'The text of the question',
    example: 'Do you have any prior therapy experience?',
  })
  @IsOptional()
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Type of question (e.g., multiple_choice, text_input)',
    example: 'multiple_choice',
  })
  @IsOptional()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Optional field name for dynamic form processing',
    example: 'experienceField',
  })
  @IsOptional()
  @IsString()
  field_name: string;

  @ApiProperty({
    description: 'UUID of the therapy type (modal) this question belongs to',
    example: 'e4b1bc56-924f-4fc7-8b2f-8d49a3ccf42b',
  })
  @IsOptional()
  @IsUUID()
  modalId: string;
}
