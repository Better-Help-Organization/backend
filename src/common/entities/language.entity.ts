import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';

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
}