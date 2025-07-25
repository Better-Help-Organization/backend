import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Repository,
  Unique
} from 'typeorm';
import { SessionType } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Note } from './note.entity';
import { Status } from './status.entity';
import { Therapist } from './therapist.entity';

import { ApiProperty } from '@nestjs/swagger';
import { ViewColumn, ViewEntity } from 'typeorm';
import { Message } from './message.entity';

@Unique('UQ_therapist_schedule', ['therapist','schedule'])
@Unique('UQ_client_schedule', ['client', 'schedule'])
@Entity('session')
export class Session extends CommonEntity {

  @ManyToOne(() => Client, { 
    nullable: true,
    cascade: true
  })
  client: Client;

  @ManyToMany(() => Client)
  @JoinTable({
    name: 'session_group_clients',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'client_id', referencedColumnName: 'id' },
  })
  group: Client[];


  @ManyToOne(() => Therapist, { 
    nullable: true,
    cascade: true
  })
  therapist: Therapist;

  @Column({ type: 'timestamp' })
  schedule: Date;

  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @Column({ type: 'enum', enum: SessionType })
  type: SessionType;

  @OneToMany(() => Note, note => note.session, {
    cascade: true,
    nullable: true, // optional
  })
  note: Note[];

  @OneToMany(() => Status, status => status.session, {
    cascade: true,
    nullable: true, // optional
  })
  status: Status;

  @ApiProperty({ type: () => Message, isArray: true })
  @OneToMany(() => Message, (message) => message.session, {onDelete: 'CASCADE'})
  message: Message[];

    async addMessage(
    msgRepo: Repository<Message>,
    messageText: string,
    therapist ?: Therapist,
    client?: Client
  ) {
    const message = msgRepo.create({
      content: messageText,
      therapist,
      client,
      session: this,
    });
    
    return await msgRepo.save(message);
  }

  async editMessage(
    msgRepo: Repository<Message>,
    messageId: string,
    newMessageText: string
  ) {
    const message = await msgRepo.findOne({
      where: { id: messageId, session: this },
    });
  
    if (!message) {
      throw new Error('Message not found or does not belong to this chat');
    }
  
    message.content = newMessageText;
    return await msgRepo.save(message);
  }

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
