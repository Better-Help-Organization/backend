import {
  Entity,
  Column,
} from 'typeorm';
import { CommonEntity } from './common.entity';
import { SessionStatus } from '../constants';



@Entity('status')
export class Status extends CommonEntity {

  @Column({
    type: 'enum',
    enum: SessionStatus,
  })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;
}
