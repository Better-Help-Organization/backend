import { Entity, Column } from 'typeorm';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Client extends User {
  @Column()
  username: string;

  @Column()
  emergencyContact: string;

  @Column({ default: false })
  isVisible: boolean;

  @Column({ default: false })
  therapyTypes: boolean;

  @Column({ type: 'enum', enum: UserTypes, default: UserTypes.CLIENT })
  type: UserTypes;
}
