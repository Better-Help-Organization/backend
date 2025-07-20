import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';
import { CommonEntity } from './common.entity';

@Entity('note')
export class Note extends CommonEntity {

  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @ManyToOne(() => Therapist, { nullable: false })
  therapist: Therapist;

  @Column({ type: 'text' })
  content: string;
}
