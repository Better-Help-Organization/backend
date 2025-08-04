import {
  Entity,
  ManyToOne,
  OneToMany,
  Repository,
  Unique
} from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

import { ApiProperty } from '@nestjs/swagger';
import { Message } from './message.entity';
import { Session } from './session.entity';

@Unique('UQ_client_therapist', ['client', 'therapist'])
@Entity('chat')
export class Chat extends CommonEntity {

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

  async addMessage(
    msgRepo: Repository<Message>,
    content: string,
    therapist ?: Therapist,
    client?: Client,
      session?: Session,
  ) {

    if (!this.id) {
    throw new Error('Chat must be saved before adding messages');
  }

    const message = msgRepo.create({
      content,
      therapist,
      client,
      chat: this,
          session,

    });
    
    return await msgRepo.save(message);
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

