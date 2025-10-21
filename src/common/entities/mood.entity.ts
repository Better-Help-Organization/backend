import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { MoodValues } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';

@Entity()
@Unique(['client', 'date']) // ensures one mood entry per client per day
export class Mood extends CommonEntity {
  
 @ApiProperty({ description: 'Mood value, e.g., happy, sad, neutral, or a scale 1-10' })
 @Column({
    type: "enum",
    default: MoodValues.NEUTRAL,
    enum: MoodValues,
  })
  mood: MoodValues;

  @ApiProperty({ description: 'Optional notes about the mood' })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({ description: 'Date the mood is recorded (only one per day allowed)' })
  @Column({ select:false, type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @ManyToOne(() => Client, client => client.moods, { onDelete: 'CASCADE' })
  client: Client;
}
