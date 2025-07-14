import { Entity } from 'typeorm';
import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity()
export class Admin extends User {

}