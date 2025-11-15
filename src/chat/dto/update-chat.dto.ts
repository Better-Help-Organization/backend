import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @ApiProperty({
    description: 'Name of the group',
    example: 'Anxiety Support Group',
  })
  @IsOptional()
  @IsString()
  groupName: string;
}
