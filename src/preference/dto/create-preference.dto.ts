import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Gender } from 'src/common/constants';
import { CreatePreferenceAvailabilityDto } from './create-preference-availability.dto';

export class CreatePreferenceDto {
  @ApiProperty({ description: 'Modal UUID', example: '2ec3e1e3-6c62-4b10-8c3f-49d456011d60' })
  @IsNotEmpty()
  @IsUUID()
  modalId: string;

  @ApiProperty({ description: 'Gender', enum: Gender })
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Array of Language UUIDs',
    example: ['fea90470-5563-403a-9b38-21c2aa62856d', 'd80c785f-6781-4cde-8511-12c9e1f44ef3'],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('all', { each: true })
  languageIds?: string[];

  @ApiProperty({
    description: 'string',
    example: 'Somalian',
  })
  @IsOptional()
  @IsString()
  otherLang?: string;

  @ApiProperty({ description: 'Personal goals for the session', example: 'Improve communication skills' })
  @IsNotEmpty()
  @IsString()
  goal: string;

  @ApiProperty({ description: 'level UUID', example: '2ec3e1e3-6c62-4b10-8c3f-49d456011d60' })
  @IsNotEmpty()
  @IsUUID()
  levelId: string; 
  
  @ApiProperty({ type: () => [CreatePreferenceAvailabilityDto], required: true })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePreferenceAvailabilityDto)
  availability: CreatePreferenceAvailabilityDto[];
}