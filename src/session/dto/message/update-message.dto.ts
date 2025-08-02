import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  content: string;

}
