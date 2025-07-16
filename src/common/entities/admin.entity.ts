import { Column, Entity } from 'typeorm';
import 'reflect-metadata';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Admin extends User {
  // @Column({ type: 'enum', enum: UserTypes, default: UserTypes.ADMIN })
  // type: UserTypes;
}