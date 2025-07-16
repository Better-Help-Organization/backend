import { Entity, Column } from 'typeorm';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Therapist extends User {
  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: false })
  verified: boolean;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    default: null,
    nullable: true,
  })
  rating: number;

  // @Column({ type: 'enum', enum: UserTypes, default: UserTypes.THERAPIST })
  // type: UserTypes;
}
