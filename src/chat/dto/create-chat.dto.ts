import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { RequiredIfPropertyMissing } from 'src/common/validators/required-if.validator';

export class CreateChatDto {


  @ApiProperty({
    description: 'Name of the group',
    example: 'Anxiety Support Group',
  })
  @IsOptional()
  @IsString()
  groupName: string;
  
  @ApiProperty({
    description: 'Array of client UUIDs for group sessions',
    example: [
      'a7e6d68a-3931-4b90-b9d3-bbd3d40813b1',
      'c2633123-1e65-4c3e-a2a3-3b8b78901c3f',
    ],
  })
  @RequiredIfPropertyMissing('client')
  @IsArray()
  @IsUUID('all', { each: true })
  groupClients?: string[];

  @ApiProperty({
    example: 'a7e6d68a-3931-4b90-b9d3-bbd3d40813b1',
  })
  @RequiredIfPropertyMissing('groupClients')
  @IsUUID()
  client: string;

  @ApiProperty({    
    example: 'c2633123-1e65-4c3e-a2a3-3b8b78901c3f',  
    })
  @IsUUID()
  @IsNotEmpty()
  therapist: string;

}
