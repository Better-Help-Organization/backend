import { IsString, IsInt, Min, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from 'src/common/constants';

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

  @ApiProperty({ example: '09:00:00' })
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  duration: number;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @IsNotEmpty()
  timezone: string;
}