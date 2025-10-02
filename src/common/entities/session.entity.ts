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
import { ApprovalStatus, SessionStatus, SessionType } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Status } from './status.entity';
import { Therapist } from './therapist.entity';

import { ApiProperty } from '@nestjs/swagger';
import { Message } from './message.entity';
import { Modal } from './modal.entity';

@Entity('session')
@Unique(['client', 'therapist', 'modal', 'schedule'])
export class Session extends CommonEntity {

  @ApiProperty({ type : () => Client})
  @ManyToOne(() => Client, { 
    nullable: true,
    // cascade: true
  })
  client: Client;

  @ApiProperty({ type : () => [Client] })
  @ManyToMany(() => Client, {
    nullable: true,
    // cascade: true
    // eager: true, // Automatically load group clients when fetching the session
    // onDelete: 'CASCADE', // If a client is deleted, remove them from the session group
    // onUpdate: 'CASCADE' // Optional, if you want to update client references automatically
  })
  @JoinTable({
    name: 'session_group_clients',
    joinColumn: { name: 'session_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'client_id', referencedColumnName: 'id' },
  })
  group: Client[];

  @ApiProperty({nullable:true})
  @Column({ type: 'text', nullable:true })
  groupName: string;


  @ApiProperty({type : () => Therapist})
  @ManyToOne(() => Therapist, { 
    nullable: true,
    // cascade: true
  })
  therapist: Therapist;

  @ApiProperty({ default: false })
  @Column({default: false })
  hasclientAttended: boolean;

  @ApiProperty({ default: false })
  @Column({default: false, nullable:true })
  hasTherapistAttended: boolean;

  @ApiProperty()
  @Column({ type: 'timestamp' })
  schedule: Date;

  @ApiProperty()
  @Column({ type: 'int', comment: 'Duration in minutes' })
  duration: number;

  @ApiProperty()
  @Column({ type: 'enum', enum: SessionType })
  type: SessionType;

  @ApiProperty({nullable:true})
  @Column({ type: 'text', nullable:true })
  note: string;

  @ApiProperty()
  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  approvalStatus: ApprovalStatus;

  @ApiProperty()
  @Column({ nullable: true })
  commonId: string;

  @ApiProperty()
  @OneToMany(() => Status, status => status.session, {
    cascade: true,
    nullable: true, // optional
  })
  status: Status;

  @ApiProperty({
    enum: SessionStatus,
    description: 'Latest session status',
  })
  @Column({ type: 'enum', enum: SessionStatus, nullable: true })
  latestStatus: SessionStatus;

  @ApiProperty({
    description: 'Reason for latest status',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  latestReason: string;

  @ApiProperty({ type: () => Message, isArray: true })
  @OneToMany(() => Message, (message) => message.session, {onDelete: 'CASCADE'})
  message: Message[];

  @ApiProperty({type : () => Modal})
  @ManyToOne(() => Modal, (modal) => modal.session, { onDelete: 'RESTRICT' })
  modal: Modal;

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
      throw new Error('Message not found or does not belong to this session');
    }
  
    message.content = newMessageText;
    return await msgRepo.save(message);
  }

}
