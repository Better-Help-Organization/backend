import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToMany } from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';
import { Therapist } from './therapist.entity';

@Entity()
export class Language extends CommonEntity {

  @ApiProperty()
  @Column({ unique: true })
  code: string;

  @ApiProperty()
  @Column({unique: true})
  name: string;

  @ApiProperty({type: () => Preference})  
  @ManyToMany(() => Preference, preference => preference.language)
  preference: Preference[];


  @ApiProperty({type: () => Therapist})  
  @ManyToMany(() => Therapist, therapist => therapist.language)
  therapist: Therapist[];

  @ApiProperty({type: () => Client})  
  @ManyToMany(() => Client, client => client.language)
  client: Client[];

}