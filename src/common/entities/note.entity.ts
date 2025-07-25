import {
  Column,
  Entity,
  ManyToOne
} from 'typeorm';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';

@Entity('note')
export class Note extends CommonEntity {

  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @ManyToOne(() => Therapist, { nullable: false })
  therapist: Therapist;

  @Column({ type: 'text' })
  content: string;
}
