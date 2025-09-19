import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBankDto {

  @ApiProperty({
    description: 'Updated name of the bank',
    example: 'Dashin',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Update whether the bank is optional (true) or required (false)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;
}
