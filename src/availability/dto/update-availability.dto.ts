import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsInt, Min, IsOptional, IsNotEmpty } from 'class-validator';
import { DayOfWeek } from 'src/common/constants';

export class UpdateAvailabilityDto {
  @ApiProperty({
    example: 'Monday',
    description: 'Day of the week',
    enum: DayOfWeek,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(DayOfWeek))
  day: DayOfWeek;

  @ApiProperty({
    example: '09:00:00',
    description: 'Start time in HH:MM:SS format',
  })
  @IsOptional()
  @IsString()
  start_time: string;

  @ApiProperty({
    example: 60,
    description: 'Duration in minutes',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({
    example: 'America/New_York',
    description: 'IANA timezone name',
  })
  @IsOptional()
  @IsString()
  timezone: string;
}
