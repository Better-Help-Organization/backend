import { Entity, OneToMany, Column } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Language extends CommonEntity {
  @ApiProperty()
  @Column({unique: true})
  code: string;
  @ApiProperty()
  @Column({unique: true})
  name: string;

  @ApiProperty({type: () => Preference})  
  @OneToMany(() => Preference, preference => preference.language)
  preferences: Preference[];
}