import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Repository,
  Unique
} from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

import { ApiProperty } from '@nestjs/swagger';
import { Message } from './message.entity';

@Unique('UQ_client_therapist', ['client', 'therapist'])
@Entity('chat')
export class Chat extends CommonEntity {

  @ApiProperty({nullable:true})
  @Column({ type: 'text', nullable:true })
  groupName: string;
  
  @ApiProperty({ type : () => [Client] })
  @ManyToMany(() => Client, client => client.chats, { nullable: true })
  @JoinTable({
    name: 'chat_group_clients',
    joinColumn: { name: 'chat_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'chat_client_id', referencedColumnName: 'id' },
  })
  group: Client[];

  @ApiProperty({ type : () => Client})
  @ManyToOne(() => Client, { 
    nullable: true,
  })
  client: Client;

  @ApiProperty({type : () => Therapist})
  @ManyToOne(() => Therapist, { 
    nullable: true,
  })
  therapist: Therapist;

  @ApiProperty({ type: () => Message, isArray: true })
  @OneToMany(() => Message, (message) => message.chat, )
  message: Message[];

  // Inside Chat entity class
  @ApiProperty({ type: () => Message })
  @OneToOne(() => Message, { nullable: true, cascade: true, eager: true , onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_message_id' })
  lastMessage: Message;

  @Column({ nullable: true })
  activeCallRoom: string;


  @ApiProperty({ default: false })
  @Column({default: false })
  closed: boolean;

  async addMessage(
    msgRepo: Repository<Message>,
    content: string,
    therapist ?: Therapist,
    client?: Client,
    chatRepo?: Repository<Chat>,
  ) {

    if (!this.id) {
    throw new Error('Chat must be saved before adding messages');
  }

    const message = msgRepo.create({
      content,
      therapist,
      client,
      chat: this,
    });
    console.log(message)
    const savedMessage = await msgRepo.save(message);

    if (chatRepo) {
      this.lastMessage = savedMessage;
      this.updatedAt = new Date();
      await chatRepo.save(this);
    }

    return savedMessage;

  }

  async editMessage(
    msgRepo: Repository<Message>,
    messageId: string,
    newMessageText: string
  ) {
    const message = await msgRepo.findOne({
      where: { id: messageId, chat: this },
    });
  
    if (!message) {
      throw new Error('chat not found or does not belong to this chat');
    }
  
    message.content = newMessageText;
    return await msgRepo.save(message);
  }

}

