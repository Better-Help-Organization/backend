import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleChatDto {

  @ApiProperty({
    description: 'status of the chat',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  closed: boolean;
}
