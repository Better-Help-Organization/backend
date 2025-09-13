import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { DayOfWeek, DayPeriod } from '../constants';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';
import { Therapist } from './therapist.entity';

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

  @Column({ type: 'enum', enum: DayOfWeek, nullable: true})
  @ApiProperty({
    example: 'Monday',
    description: 'Day of the week',
    enum: DayOfWeek,
  })
  day: DayOfWeek;

  @Column({ type: 'enum', enum: DayPeriod, nullable: true})
  @ApiProperty({
    example: 'morning',
    description: 'Time period of the Day',
    enum: DayPeriod,
  })
  day_period: DayPeriod;

  @ApiProperty()
  @Column({ type: 'timestamp', nullable: true})
  schedule: Date;

  @ApiProperty()
  @Column({ type: 'int', comment: 'Duration in minutes', nullable: true})
  duration: number;
}