import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { MatchTherapist } from './match-therapist.entity';
import { Therapist } from './therapist.entity';

@Entity()
export class Match extends CommonEntity {
  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.match, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({ type: () => [MatchTherapist] })
  @OneToMany(() => MatchTherapist, matchTherapist => matchTherapist.match, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  matchedTherapist: MatchTherapist[];

  @ApiProperty({ type: () => Therapist, nullable: true })
  @ManyToOne(() => Therapist, therapist => therapist.acceptedMatch, { nullable: true, onDelete: 'SET NULL', eager: true })
  accepted: Therapist;

  @ApiProperty({ required: false })
  @Column('timestamp', { nullable: true })
  expiresAt: Date;
}