import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty} from '@nestjs/swagger';

export class UpdateOptionDto {
  @ApiProperty({ description: 'Option display text', example: 'Yes' })
  @IsOptional()
  @IsString()
  text: string;

  // @ApiProperty({ description: 'Type of the option', example: 'multiple_choice' })
  // @IsOptional()
  // @IsString()
  // type: string;

  // @ApiProperty({
  //   description: 'Optional field name used for form processing',
  //   example: 'hasExperience',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // field_name: string;

  @ApiProperty({
    description: 'UUID of the question this option belongs to',
    example: 'abcf3a1a-df12-4451-8922-b0c5adf2001a',
  })
  @IsOptional()
  @IsUUID()
  questionId: string;
}
