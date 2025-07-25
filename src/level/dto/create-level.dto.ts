import { IsString, IsInt, IsOptional, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({
    example: 'Beginner',
    description: 'The unique name of the level, e.g., Beginner, Intermediate, Expert.',
  })
  @IsString()
  type: string;

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
  @IsInt()
  @IsPositive()
  price: number;
}