import { Entity, Column, ManyToOne, Unique, OneToMany, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { Client } from './client.entity';
import { Modal } from './modal.entity';
import { Language } from './language.entity';
import { CommonEntity } from './common.entity';
import { Gender, SessionFormat } from '../constants';
import { ApiProperty } from '@nestjs/swagger';
import { Level } from './level.entity';
import { Availability } from './availability.entity';

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
  @Column({ type: 'enum', enum: SessionFormat })
  sessionFormat: SessionFormat;

  @ApiProperty()
  @Column('text')
  goal: string;

  @ApiProperty({ type: () => Level })
  @ManyToOne(() => Level, { nullable: true, onDelete: 'SET NULL' })
  level: Level;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.preference, {cascade: true})
  availability: Availability[];
}