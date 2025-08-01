import { IsString, IsIn, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from 'src/common/constants';

export class CreateIndividualAvailabilityDto {
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
  @IsNotEmpty()
  @IsString()
  start_time: string;

  @ApiProperty({
    example: 60,
    description: 'Duration in minutes',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({
    example: 'America/New_York',
    description: 'IANA timezone name',
  })
  @IsNotEmpty()
  @IsString()
  timezone: string;
}