import { Entity, Column } from 'typeorm';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Therapist extends User {
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: false })
  verified: boolean;
}
