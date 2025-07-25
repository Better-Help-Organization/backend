import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLanguageDto {
  @ApiProperty({ 
    description: 'Language code', 
    example: 'en',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Full name of the language', example: 'English' })
  @IsNotEmpty()
  @IsString()
  name: string;
}