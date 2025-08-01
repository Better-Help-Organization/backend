import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { Therapist } from './therapist.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CommonEntity } from './common.entity';
import { DayOfWeek } from '../constants';

@Unique(['therapist', 'day', 'start_time'])
@Unique(['preference', 'day', 'start_time'])
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

  @ApiProperty({ example: '09:00:00' })
  @Column({ type: 'time' })
  start_time: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @Column({ type: 'int' })
  duration: number;

  @ApiProperty({ example: 'America/New_York' })
  @Column()
  timezone: string;
}