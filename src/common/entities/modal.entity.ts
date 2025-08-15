import { Entity, Column, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Question } from './question.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';
import { License } from './license.entity';
import { Answer } from './answer.entity';

@Entity()
export class Modal extends CommonEntity {
  @ApiProperty()
  @Column({unique: true})
  name: string;

  @ApiProperty() 
  @Column('text')
  description: string;

  @ApiProperty({type: () => Preference})
  @OneToMany(() => Preference, preference => preference.modal)
  preference: Preference[];

  @ApiProperty({type: () => Question})
  @OneToMany(() => Question, question => question.modal)
  question: Question[];

  @ApiProperty({type: () => Answer})
  @OneToMany(() => Answer, answer => answer.modal)
  answer: Answer[];

  @ApiProperty({type: () => License})
  @OneToMany(() => License, license => license.modal)
  license: License[];
}