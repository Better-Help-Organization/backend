import { IsUUID, IsString, IsDateString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsNotEmpty()
  @IsString()
  license_number: string;

  @ApiProperty({
    example: 'California',
    description: 'Region or state where the license is valid',
  })
  @IsNotEmpty()
  @IsString()
  region: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Date when the license expires (YYYY-MM-DD)',
  })
  @IsNotEmpty()
  @IsDateString()
  expiration_date: string;

  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24_6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24.pdf',
    description: 'File name of the uploaded licence',
  })
  @IsNotEmpty()
  @IsString()
  filename: string;
}
