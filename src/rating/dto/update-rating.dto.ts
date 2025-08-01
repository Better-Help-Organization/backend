import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { MAX_RATING, MIN_RATING } from 'src/common/constants';

export class UpdateRatingDto {
  @ApiProperty({
    example: '21d9f3e5-74b6-489c-b7f0-3dbd03c0e141',
    description: 'UUID of the therapist being rated',
  })
  @IsOptional()
  @IsUUID()
  therapistId: string;

  @ApiProperty({
    example: MAX_RATING,
    description: `Rating value between ${MIN_RATING} and ${MAX_RATING}`,
  })
  @IsOptional()
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
