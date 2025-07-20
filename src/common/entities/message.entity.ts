import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';

@Entity('message')
export class Message extends CommonEntity {

  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @ManyToOne(() => Therapist, { nullable: false })
  therapist: Therapist;

  @ManyToOne(() => Client, { nullable: false })
  client: Client;

  @Column({ type: 'text' })
  content: string;
}
