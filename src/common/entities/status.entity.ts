import {
  Column,
  Entity,
  ManyToOne,
} from 'typeorm';
import { SessionStatus } from '../constants';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';



@Entity('status')
export class Status extends CommonEntity {

  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @Column({
    type: 'enum',
    enum: SessionStatus,
  })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;
}
