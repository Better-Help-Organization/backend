import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  ManyToOne
} from 'typeorm';
import { Chat } from './chat.entity';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';

@Entity('message')
export class Message extends CommonEntity {

  @ApiProperty({nullable:true, type: () => Session})
  @ManyToOne(() => Session, { nullable: true })
  session: Session;

  @ApiProperty({ type: () => Chat })
  @ManyToOne(() => Chat, (chat) => chat.message, {nullable: true})
  chat: Chat;

  @ApiProperty({nullable:true, type: () => Therapist})
  @ManyToOne(() => Therapist, { nullable: true, eager: true })
  therapist: Therapist;

  @ApiProperty({nullable:true, type: () => Client})
  @ManyToOne(() => Client, { nullable: true, eager: true })
  client: Client;

  @ApiProperty({nullable:true})
  @Column({ type: 'text' })
  content: string;

  // @ApiProperty({ default: false, description: "Whether the recipient has seen the message" })
  // @Column({ type: 'boolean', default: false })
  // isRead: boolean;
}
