import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { MIN_RATING, MAX_RATING } from 'src/common/constants';

export class CreateRatingDto {
  @ApiProperty({
    example: '21d9f3e5-74b6-489c-b7f0-3dbd03c0e141',
    description: 'UUID of the therapist being rated',
  })
  @IsNotEmpty()
  @IsUUID()
  therapistId: string;

  @ApiProperty({
    example: MAX_RATING,
    description: `Rating value between ${MIN_RATING} and ${MAX_RATING}`,
  })
  @IsInt()
  @Min(MIN_RATING)
  @Max(MAX_RATING)
  value: number;

  @ApiProperty({
    example: 'Very helpful and professional!',
    description: 'Optional comment left by the client',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}