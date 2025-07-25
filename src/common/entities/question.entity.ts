import { Entity, Column, OneToMany, ManyToOne, Unique } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Option } from './option.entity';
import { Answer } from './answer.entity';
import { Modal } from './modal.entity';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '../constants';

@Unique(['text', 'modal'])
@Entity()
export class Question extends CommonEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 500 })
  text: string;

  @ApiProperty()
  @Column({    
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType;

  @ApiProperty({type: () => Option})
  @OneToMany(() => Option, option => option.question, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  option: Option[];

  @ApiProperty({type: () => Answer})
  @OneToMany(() => Answer, answer => answer.question)
  answer: Answer[];

  @ApiProperty({type: () => Modal})
  @ManyToOne(() => Modal, modal => modal.question, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  modal: Modal;
}