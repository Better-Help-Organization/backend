import { IsArray, IsEnum, IsJSON, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, SessionFormat } from 'src/common/constants';

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'Modal UUID', example: '2ec3e1e3-6c62-4b10-8c3f-49d456011d60' })
  @IsOptional()
  @IsUUID()
  modalId: string;

  @ApiProperty({ description: 'Gender', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Array of Language UUIDs',
    example: ['fea90470-5563-403a-9b38-21c2aa62856d', 'd80c785f-6781-4cde-8511-12c9e1f44ef3'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  languageIds?: string[];

  @ApiProperty({ description: 'Session Format', enum: SessionFormat })
  @IsOptional()
  @IsEnum(SessionFormat)
  sessionFormat: SessionFormat;

  @ApiProperty({ description: 'Personal goals for the session', example: 'Improve communication skills' })
  @IsOptional()
  @IsString()
  goal: string;

  @ApiProperty({ description: 'level UUID', example: '2ec3e1e3-6c62-4b10-8c3f-49d456011d60' })
  @IsOptional()
  @IsUUID()
  levelId: string;  
}