import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { Availability } from './availability.entity';
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
}
