import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinTable, Unique } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Question } from './question.entity';
import { Answer } from './answer.entity';
import { ApiProperty } from '@nestjs/swagger';

@Unique(['text', 'question'])
@Entity()
export class Option extends CommonEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 500 })
  text: string;

  @ApiProperty({type: () => Question})
  @ManyToOne(() => Question, question => question.option, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  question: Question;

  @ApiProperty({type: () => Answer})
  @OneToMany(() => Answer, answer => answer.singleOption)
  singleAnswer: Answer[];

  @ApiProperty({type: () => Answer})
  @ManyToMany(() => Answer, answer => answer.multiOption, { cascade: true, nullable: true })
  @JoinTable()
  multiAnswer: Answer[];
}