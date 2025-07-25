import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Therapist } from './therapist.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Availability {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.availability, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  therapist: Therapist;

  @ApiProperty({ type: () => Preference })
  @ManyToOne(() => Preference, preference => preference.availability, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  preference: Preference;

  @ApiProperty({ example: 'Monday' })
  @Column()
  day: string;

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
