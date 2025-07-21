import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { Client } from './client.entity';
import { Modal } from './modal.entity';
import { Language } from './language.entity';
import { CommonEntity } from './common.entity';
import { Gender } from '../constants';
import { ApiProperty } from '@nestjs/swagger';

@Unique(['client', 'modal', 'language'])
@Entity()
export class Preference extends CommonEntity {
  @ApiProperty({type: () => Client})
  @ManyToOne(() => Client, client => client.preferences, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({type: () => Modal})
  @ManyToOne(() => Modal, modal => modal.preferences, { onDelete: 'SET NULL', nullable: true })
  modal: Modal;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @ApiProperty({type: () => Language})
  @ManyToOne(() => Language, language => language.preferences, { onDelete: 'SET NULL', nullable: true })
  language: Language;

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  days: any;

  @ApiProperty()
  @Column({ type: 'json',  nullable: true })
  times: any;

  @ApiProperty()
  @Column('text')
  goals: string;
}