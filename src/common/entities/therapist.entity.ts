import { Entity, Column } from 'typeorm';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Therapist extends User {
  @Column({ type: 'text' })
  bio: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'float', default: 0.0 })
  rating: number;

  // @Column({ type: 'enum', enum: UserTypes, default: UserTypes.THERAPIST })
  // type: UserTypes;
}
