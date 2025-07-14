import { Entity } from 'typeorm';
import { CommonEntity } from './common.entity';
import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity()
export class Client extends User {

}