import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { QuestionType } from '../constants';
import { Answer } from './answer.entity';
import { CommonEntity } from './common.entity';
import { Modal } from './modal.entity';
import { Option } from './option.entity';

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
    eager:true
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