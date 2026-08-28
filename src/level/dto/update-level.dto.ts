import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateLevelDto {

  @ApiProperty({
    example: 0,
    description: 'The minimum XP required to qualify for this level. Optional.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minXP?: number;

  @ApiProperty({
    example: 100,
    description: 'The maximum XP allowed for this level. Optional.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxXP?: number;

  @ApiProperty({
    example: 580,
    description: 'The price associated with this level, typically in credits or points.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  price: number;
}