import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AcceptMatchDto {
  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24',
    description: 'UUID of the match therapist is accepting',
  })
  @IsNotEmpty()
  @IsUUID()
  matchId: string;
}
