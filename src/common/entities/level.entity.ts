import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';

@Entity()
export class Level extends CommonEntity{
  @ApiProperty()
  @Column({unique: true})
  type: string;

  @ApiProperty({ example: 0 })
  @Column('int', { 
    nullable: true,
    default: null 
  })
  minXP: number;

  @ApiProperty({ example: 10})
  @Column('int', { 
    nullable: true,
    default: null 
  })
  maxXP: number;

  @ApiProperty({ example: 580 })
  @Column('int')
  price: number;

  @ApiProperty({type: () => Preference})  
  @OneToOne(() => Preference, preference => preference.level)
  preference: Preference[];
}
