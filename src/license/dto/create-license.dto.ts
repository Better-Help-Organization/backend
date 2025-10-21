import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLicenseDto {
  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24',
    description: 'UUID of the modality (e.g., therapist specialization)',
  })
  @IsNotEmpty()
  @IsUUID()
  modalId: string;

  @ApiProperty({
    example: '123456-CA',
    description: 'Unique license number issued by the regional board',
  })
  @IsOptional()
  @IsString()
  license_number: string;

  @ApiProperty({
    example: 'California',
    description: 'Region or state where the license is valid',
  })
  @IsOptional()
  @IsString()
  region: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Date when the license expires (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  expiration_date: string;

  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24.pdf',
    description: 'File name of the uploaded licence',
  })
  @IsOptional()
  @IsString()
  filename: string;

  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24.pdf',
    description: 'File name of the uploaded licence',
  })
  @IsOptional()
  @IsString()
  work_experience: string;
}
