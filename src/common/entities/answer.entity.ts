import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToMany, ManyToOne, Unique } from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Modal } from './modal.entity';
import { Option } from './option.entity';
import { Question } from './question.entity';

@Unique(['client', 'question'])
// @Unique(['client', 'modal'])
@Entity()
export class Answer extends CommonEntity {
  @ApiProperty({type: () => Client})
  @ManyToOne(() => Client, client => client.answer, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({type: () => Question})
  @ManyToOne(() => Question, question => question.answer, { onDelete: 'CASCADE' })
  question: Question;

  @ApiProperty({type: () => Modal})
  @ManyToOne(() => Modal, modal => modal.answer, { onDelete: 'CASCADE' })
  modal: Modal;

  @ApiProperty({type: () => Option})
  @ManyToOne(() => Option, option => option.singleAnswer, { onDelete: 'CASCADE', nullable: true })
  singleOption: Option;

  @ApiProperty({type: () => Option})
  @ManyToMany(() => Option, option => option.multiAnswer)
  multiOption: Option[];

  @ApiProperty({ type: String, required: false })
  @Column({ type: 'text', nullable: true })
  text?: string;
}