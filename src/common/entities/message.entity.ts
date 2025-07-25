import {
  Column,
  Entity,
  ManyToOne
} from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';

@Entity('message')
export class Message extends CommonEntity {

  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @ManyToOne(() => Therapist, { nullable: true, eager: true })
  therapist: Therapist;

  @ManyToOne(() => Client, { nullable: true, eager: true })
  client: Client;

  @Column({ type: 'text' })
  content: string;
}
