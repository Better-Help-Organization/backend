import { Entity } from 'typeorm';
import { CommonEntity } from './common.entity';
import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User extends CommonEntity {

}