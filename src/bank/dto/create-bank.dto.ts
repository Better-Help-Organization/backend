import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBankDto {

  @ApiProperty({
    description: 'Name of the bank',
    example: 'Negd',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Whether the bank is optional (true) or required (false)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  optional?: boolean;

}
