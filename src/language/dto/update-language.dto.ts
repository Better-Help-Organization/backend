import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLanguageDto {
  @ApiProperty({ 
    description: 'Language code', 
    example: 'en',
    required: false 
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ 
    description: 'Full name of the language', 
    example: 'English',
    required: false 
  })
  @IsOptional()
  @IsString()
  name?: string;
}