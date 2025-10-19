import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { Answer } from './answer.entity';
import { CommonEntity } from './common.entity';
import { License } from './license.entity';
import { Preference } from './preference.entity';
import { Question } from './question.entity';
import { Session } from './session.entity';

@Entity()
export class Modal extends CommonEntity {
  
  @ApiProperty()
  @Column({unique: true})
  name: string;

  @ApiProperty()
  @Column({unique: true, nullable: true})
  order: number;

  @ApiProperty()
  @Column({unique: true, nullable: true})
  code: number;

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

  @ApiProperty({type: () => Session})
  @OneToMany(() => Session, (session) => session.modal)
  session: Session[];

}