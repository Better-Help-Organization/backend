import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDiaryDto {
  @ApiProperty({
    description: 'Title of the diary entry',
    example: 'Weekly Therapy Notes',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Content of the diary entry',
    example: 'Client reported improved mood since last session.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string;

}