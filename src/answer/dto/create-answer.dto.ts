import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty({ description: 'UUID of the client', example: 'b8a7dbfe-e9ff-4f3c-950c-bf2c9c304e5a' })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'UUID of the question', example: 'e4f809df-a1a2-472a-bc91-cb4df70ee538' })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'UUID of the option selected', example: '5a799d9f-bc39-4984-8dd6-fba7ccfb34a2' })
  @IsNotEmpty()
  @IsUUID()
  optionId: string;
}