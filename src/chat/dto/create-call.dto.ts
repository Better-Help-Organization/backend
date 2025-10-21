import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateCallDto {
  @ApiProperty({
    description: 'The unique room identifier for the call',
    example: 'room12345',
  })
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiProperty({
    description: 'Indicates if the call is a video call',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isVideoCall: boolean;
}