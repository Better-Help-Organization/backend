import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Question } from './question.entity';
import { Answer } from './answer.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Option extends CommonEntity {
  @ApiProperty()
  @Column('text')
  text: string;

  @ApiProperty()
  @Column()
  type: string;

  @ApiProperty()
  @Column({nullable: true})
  field_name: string;

  @ApiProperty({type: () => Question})
  @ManyToOne(() => Question, question => question.options, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  question: Question;

  @ApiProperty({type: () => Answer})
  @OneToMany(() => Answer, answer => answer.option)
  answers: Answer[];
}