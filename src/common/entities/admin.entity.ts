import { Column, Entity } from 'typeorm';
import 'reflect-metadata';
import { User } from './user.entity';
import { UserTypes } from '../constants';

@Entity()
export class Admin extends User {}