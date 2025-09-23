import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Gender } from '../constants';
import { Availability } from './availability.entity';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Language } from './language.entity';
import { Level } from './level.entity';
import { Modal } from './modal.entity';

@Unique(['client', 'modal'])
@Entity()
export class Preference extends CommonEntity {
  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.preference, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({ type: () => Modal })
  @ManyToOne(() => Modal, modal => modal.preference, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  modal: Modal;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @ApiProperty({ type: () => [Language] })
  @ManyToMany(() => Language, language => language.preference)
  @JoinTable()
  language: Language[];

  @ApiProperty()
  @Column({type:'text', nullable: true})
  otherLang?: string;

  @ApiProperty()
  @Column('text')
  goal: string;

  @ApiProperty({ type: () => Level })
  @ManyToOne(() => Level, { nullable: true, onDelete: 'SET NULL', eager: true })
  level: Level;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.preference, {cascade: true})
  availability: Availability[];
}