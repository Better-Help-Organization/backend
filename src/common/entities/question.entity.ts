import { Entity, Column, OneToMany, ManyToOne } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Option } from './option.entity';
import { Answer } from './answer.entity';
import { Modal } from './modal.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Question extends CommonEntity {
  @ApiProperty()
  @Column('text')
  text: string;

  @ApiProperty()
  @Column()
  type: string;

  @ApiProperty()
  @Column({nullable: true})
  field_name: string;

  @ApiProperty({type: () => Option})
  @OneToMany(() => Option, option => option.question, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  options: Option[];

  @ApiProperty({type: () => Answer})
  @OneToMany(() => Answer, answer => answer.question)
  answers: Answer[];

  @ApiProperty({type: () => Modal})
  @ManyToOne(() => Modal, modal => modal.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  modal: Modal;
}