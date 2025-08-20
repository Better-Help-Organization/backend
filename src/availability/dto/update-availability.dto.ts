import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsInt, Min, IsOptional } from 'class-validator';
import { DayOfWeek, DayPeriod } from 'src/common/constants';

export class UpdateAvailabilityDto {
  @ApiProperty({
    example: 'Monday',
    description: 'Day of the week',
    enum: DayOfWeek,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(DayOfWeek))
  day: DayOfWeek;

  @ApiProperty({
    example: 'morning',
    description: 'Time Period of the day',
    enum: DayPeriod,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(DayPeriod))
  day_period: DayPeriod;
}
