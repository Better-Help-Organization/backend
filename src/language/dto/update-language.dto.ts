import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLanguageDto {
  @ApiProperty({ description: 'Language code (e.g. en, fr)', example: 'en' })
  @IsOptional()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Full name of the language', example: 'English' })
  @IsOptional()
  @IsString()
  name: string;
}
