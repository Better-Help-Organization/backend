import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateChatDto {
  
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
