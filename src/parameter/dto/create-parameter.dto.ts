import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';


export class CreateParameterDto {
  @ApiProperty({
    example: 'USER_DEFAULT_SETTINGS',
    description: 'The name of the parameter',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'default_theme:dark',
    description: 'The value of the parameter',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

}
