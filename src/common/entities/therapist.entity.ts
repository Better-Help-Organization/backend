import { Entity, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Availability } from './availability.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Therapist extends User {
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: false })
  verified: boolean;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.therapist)
  availability: Availability[];
}
