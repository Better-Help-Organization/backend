import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateLicenseDto {
  @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24',
    description: 'UUID of the modality (e.g., therapist specialization)',
  })
  @IsOptional()
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
    example: true,
    description: 'Whether the license has been verified by the platform',
  })
  @IsOptional()
  @IsBoolean()
  verified: boolean;
}
