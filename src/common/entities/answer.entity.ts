import { Entity, ManyToOne, Unique } from 'typeorm';
import { Client } from './client.entity';
import { Question } from './question.entity';
import { Option } from './option.entity';
import { CommonEntity } from './common.entity';
import { ApiProperty } from '@nestjs/swagger';

@Unique(['client', 'question'])
@Entity()
export class Answer extends CommonEntity {
  @ApiProperty({type: () => Client})
  @ManyToOne(() => Client, client => client.answers, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({type: () => Question})
  @ManyToOne(() => Question, question => question.answers, { onDelete: 'CASCADE' })
  question: Question;

  @ApiProperty({type: () => Option})
  @ManyToOne(() => Option, option => option.answers, { onDelete: 'CASCADE' })
  option: Option;
}