import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateChatDto {

  @ApiProperty({
    example: '1',
  })
  @IsUUID()
  @IsNotEmpty()
  client: string;

  @ApiProperty({    
    example: '1',  
    })
  @IsUUID()
  @IsNotEmpty()
  therapist: string;

}
