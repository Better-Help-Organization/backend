import { IsString, IsUUID, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOptionDto {
  @ApiProperty({ description: 'Option display text', example: 'Yes' })
  @IsNotEmpty()
  @IsString()
  text: string;

  @ApiProperty({ description: 'Type of the option', example: 'multiple_choice' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Optional field name used for form processing',
    example: 'hasExperience',
    required: false,
  })
  @IsOptional()
  @IsString()
  field_name: string;

  @ApiProperty({
    description: 'UUID of the question this option belongs to',
    example: 'abcf3a1a-df12-4451-8922-b0c5adf2001a',
  })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;
}
