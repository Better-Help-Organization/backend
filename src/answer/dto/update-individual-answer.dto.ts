import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIndividualAnswerDto {
  @ApiProperty({ description: 'UUID of the question', example: 'e4f809df-a1a2-472a-bc91-cb4df70ee538' })
  @IsOptional()
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'UUID of the single option selected', example: '5a799d9f-bc39-4984-8dd6-fba7ccfb34a2' })
  @IsOptional()
  @IsUUID()
  singleOptionId?: string;

  @ApiProperty({ 
    description: 'Array of UUIDs for multiple selected options', 
    example: ['5a799d9f-bc39-4984-8dd6-fba7ccfb34a2', '7c88f8a1-52a2-4a58-a1a9-149c4a81fabc'] 
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  multiOptionIds?: string[];

  @ApiProperty({ description: 'an optional text field for open ended questions', example: 'I want to manage my anxiety better, build healthier habits, and improve my confidence.' })
  @IsOptional()
  @IsString()
  text?: string;
}