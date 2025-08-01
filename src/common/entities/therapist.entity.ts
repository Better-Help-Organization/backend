import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Availability } from './availability.entity';
import { Level } from './level.entity';
import { License } from './license.entity';
import { MatchTherapist } from './match-therapist.entity';
import { Match } from './match.entity';
import { Rating } from './rating.entity';
import { User } from './user.entity';

@Entity()
export class Therapist extends User {

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiProperty()
  @Column({ default: false })
  verified: boolean;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.therapist)
  availability: Availability[];

  @ApiProperty({type: () => License})
  @OneToMany(() => License, license => license.therapist)
  license: License[];

  @ApiProperty({type: () => Rating})
  @OneToMany(() => Rating, rating => rating.therapist)
  rating: Rating[];

  @ApiProperty({type: () => Level})
  @ManyToOne(() => Level, level => level.therapist)
  level: Level;

  @ApiProperty({type: () => MatchTherapist})
  @OneToMany(() => MatchTherapist, matchTherapist => matchTherapist.therapist)
  match: MatchTherapist[];

  @ApiProperty({ type: () => [Match], nullable: true })
  @OneToMany(() => Match, match => match.accepted, {
    cascade: false,
    onDelete: 'SET NULL',
  })
  acceptedMatch: Match[];
}
