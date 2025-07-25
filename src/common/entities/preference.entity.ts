import { Entity, Column, ManyToOne, Unique, OneToMany, OneToOne, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
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
  @OneToOne(() => Modal, modal => modal.preference)
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
  @OneToOne(() => Level, level => level.preference, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  level: Level;

  @ApiProperty({type: () => Availability})
  @OneToMany(() => Availability, availability => availability.preference)
  availability: Availability[];
}