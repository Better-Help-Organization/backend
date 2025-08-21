import { IsString, IsInt, Min, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, DayPeriod } from 'src/common/constants';

export class CreatePreferenceAvailabilityDto {
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
    example: 'morning',
    description: 'Time Period of the day',
    enum: DayPeriod,
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(DayPeriod))
  day_period: DayPeriod;
}