import { Entity, Column } from 'typeorm';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Client extends User {
  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column({ default: false })
  isVisible: boolean;

  // @Column({ default: false })
  // therapyTypes: boolean;

}
