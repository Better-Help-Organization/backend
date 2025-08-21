import { Entity, Column, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CommonEntity } from './common.entity';
import { Match } from './match.entity';
import { Therapist } from './therapist.entity';

@Entity()
export class MatchTherapist extends CommonEntity {
  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.match, { onDelete: 'CASCADE' })
  therapist: Therapist;

  @ApiProperty({ type: () => Match })
  @ManyToOne(() => Match, match => match.matchedTherapist, {
    onDelete: 'CASCADE',
  })
  match: Match;

  @ApiProperty({ required: false })
  @Column('timestamp', { default: null, nullable: true })
  respondedAt: Date;
}