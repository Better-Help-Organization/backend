import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Question } from './question.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Modal extends CommonEntity {
  @ApiProperty()
  @Column({unique: true})
  name: string;

  @ApiProperty() 
  @Column('text')
  description: string;

  @ApiProperty({type: () => Preference})
  @OneToOne(() => Preference, preference => preference.modal, { cascade: true, onDelete: 'CASCADE' })
  preference: Preference;

  @ApiProperty({type: () => Question})
  @OneToMany(() => Question, question => question.modal, { cascade: true, onDelete: 'CASCADE' })
  question: Question[];
}