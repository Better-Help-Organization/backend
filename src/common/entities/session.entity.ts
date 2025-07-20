import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Client } from './client.entity';
import { Therapist } from './therapist.entity';
import { Status } from './status.entity';
import { CommonEntity } from './common.entity';
import { SessionType } from '../constants';
import { Note } from './note.entity';

import { ViewEntity, ViewColumn } from 'typeorm';

@Unique('UQ_therapist_schedule', ['therapist','schedule'])
@Unique('UQ_client_schedule', ['client', 'schedule'])
@Entity('session')
export class Session extends CommonEntity {

  @ManyToOne(() => Client, { nullable: true })
  client: Client;

  @ManyToMany(() => Client)
  @JoinTable({
    name: 'session_group_clients',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'client_id', referencedColumnName: 'id' },
  })
  groupClients: Client[];


  @ManyToOne(() => Therapist, { nullable: true })
  therapist: Therapist;

  @Column({ type: 'timestamp' })
  schedule: Date;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ type: 'enum', enum: SessionType })
  type: SessionType;

  @ManyToOne(() => Status, { nullable: true })
  status: Status;

  @ManyToOne(() => Note, { nullable: true })
  note: Note;
}

@ViewEntity({
  expression: `
    SELECT
      s.id,
      s.clientId,
      s.therapistId,
      s.schedule,
      s.duration,
      s.type,
      s.statusId,
      s.noteId,
      s.schedule + INTERVAL s.duration MINUTE AS end_time
    FROM session s
  `,
})
export class SessionWithEndTime {
  @ViewColumn()
  id: string;

  @ViewColumn()
  clientId: string;

  @ViewColumn()
  therapistId: string;

  @ViewColumn()
  schedule: Date;

  @ViewColumn()
  duration: number;

  @ViewColumn()
  type: string; // or SessionType enum if you want

  @ViewColumn()
  statusId: string | null;

  @ViewColumn()
  noteId: string | null;

  @ViewColumn()
  end_time: Date;
}
