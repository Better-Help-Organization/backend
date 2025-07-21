import { IsEnum, IsJSON, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/common/constants';

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'Client UUID', example: 'aa7d3b77-89d9-4c63-a289-ec69a5ef35b1' })
  @IsOptional()
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Modal UUID', example: '2ec3e1e3-6c62-4b10-8c3f-49d456011d60' })
  @IsOptional()
  @IsUUID()
  modalId: string;

  @ApiProperty({ description: 'Gender', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ description: 'Language UUID', example: 'fea90470-5563-403a-9b38-21c2aa62856d' })
  @IsOptional()
  @IsUUID()
  languageId: string;

  @ApiProperty({ description: 'Days available (JSON)', example: '["Monday", "Wednesday"]' })
  @IsOptional()
  @IsJSON()
  days: string;

  @ApiProperty({ description: 'Available time ranges (JSON)', example: '["09:00-11:00", "14:00-16:00"]' })
  @IsOptional()
  @IsJSON()
  times: string;

  @ApiProperty({ description: 'Personal goals for the session', example: 'Improve communication skills' })
  @IsOptional()
  @IsString()
  goals: string;
}