import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseStatus } from '../constants';
import { Availability } from './availability.entity';
import { Bank } from './bank.entity';
import { ClientSubscription } from './client-subscription.entity';
import { Expertise } from './expertise.entity';
import { Language } from './language.entity';
import { Level } from './level.entity';
import { License } from './license.entity';
import { MatchTherapist } from './match-therapist.entity';
import { Match } from './match.entity';
import { Rating } from './rating.entity';
import { Session } from './session.entity';
import { TherapistBank } from './therapist-bank.entity';
import { User } from './user.entity';

// @Unique('UQ_therapist_bank', ['therapist', 'bank']) // composite unique constraint
@Entity()
export class Therapist extends User {

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiProperty()
  @Column({ default: false })
  verified: boolean;

  @ApiProperty({ enum: BaseStatus, default: BaseStatus.INACTIVE })
  @Column({
      type: "enum",
      default: BaseStatus.INACTIVE,
      enum: BaseStatus,
  })
  status: BaseStatus;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.therapist)
  availability: Availability[];

  @ApiProperty({type: () => License})
  @OneToMany(() => License, license => license.therapist)
  license: License[];

  @ApiProperty()
  @OneToMany(() => Expertise, exp => exp.therapist, {
    cascade: true,
    nullable: true, // optional
    eager: true
  })
  expertise: Expertise[];

  @ApiProperty({type: () => Rating})
  @OneToMany(() => Rating, rating => rating.therapist)
  rating: Rating[];

  @ApiProperty({type: () => Level})
  @ManyToOne(() => Level, level => level.therapist)
  level: Level;

  @ApiProperty({type: () => MatchTherapist})
  @OneToMany(() => MatchTherapist, matchTherapist => matchTherapist.therapist)
  match: MatchTherapist[];


  @ApiProperty({ example: 0 })
  @Column('int', { 
    nullable: true,
    default: 0
  })
  hoursDedicatedPerWeek: number;

  @ApiProperty({ type: () => [Match], nullable: true })
  @OneToMany(() => Match, match => match.accepted, {
    cascade: false,
    onDelete: 'SET NULL',
  })
  acceptedMatch: Match[];

  @ApiProperty({ type: () => [Bank], nullable: true })
  @OneToMany(() => TherapistBank, tb => tb.therapist, { cascade: true })
  therapistBank: TherapistBank[];

  @ApiProperty({ type: () => ClientSubscription, isArray: true })
  @OneToMany(() => ClientSubscription, cs => cs.therapist)
  subscription: ClientSubscription[];

  @ApiProperty({ type: () => Session, isArray: true })
  @OneToMany(() => Session, ss => ss.therapist)
  session: Session[];

  @ApiProperty({ type: () => [Language] })
  @ManyToMany(() => Language, language => language.therapist)
  @JoinTable()
  language: Language[];

}
