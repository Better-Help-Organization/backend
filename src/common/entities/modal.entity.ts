import { Entity, Column, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Question } from './question.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Modal extends CommonEntity {
  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ApiProperty() 
  @Column('text')
  description: string;

  @ApiProperty({type: () => Preference})
  @OneToMany(() => Preference, preference => preference.modal, { cascade: true, onDelete: 'CASCADE' })
  preferences: Preference[];

  @ApiProperty({type: () => Question})
  @OneToMany(() => Question, question => question.modal, { cascade: true, onDelete: 'CASCADE' })
  questions: Question[];
}