import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { Therapist } from './therapist.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CommonEntity } from './common.entity';
import { DayOfWeek, DayPeriod } from '../constants';

@Unique(['therapist', 'day', 'day_period'])
@Unique(['preference', 'day', 'day_period'])
@Entity()
export class Availability extends CommonEntity {
  @ApiProperty({ type: () => Therapist, required: false })
  @ManyToOne(() => Therapist, therapist => therapist.availability, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  therapist?: Therapist;

  @ApiProperty({ type: () => Preference, required: false })
  @ManyToOne(() => Preference, preference => preference.availability, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  preference?: Preference;

  @Column({ type: 'enum', enum: DayOfWeek })
  @ApiProperty({
    example: 'Monday',
    description: 'Day of the week',
    enum: DayOfWeek,
  })
  day: DayOfWeek;

  @Column({ type: 'enum', enum: DayPeriod })
  @ApiProperty({
    example: 'morning',
    description: 'Time period of the Day',
    enum: DayPeriod,
  })
  day_period: DayPeriod;
}