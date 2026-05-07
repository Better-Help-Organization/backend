import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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

  // @ApiProperty({
  //   description: 'Indicates if the call is a group call',
  //   example: true,
  // })
  // @IsBoolean()
  // @IsNotEmpty()
  // isGroupCall: boolean;  
  
  @ApiProperty({
      description: 'Array of Language UUIDs',
      example: ['fea90470-5563-403a-9b38-21c2aa62856d', 'd80c785f-6781-4cde-8511-12c9e1f44ef3'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    calleeIds?: string[];
}