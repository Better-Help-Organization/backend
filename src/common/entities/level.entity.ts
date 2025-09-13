import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Preference } from './preference.entity';
import { Subscription } from './subscription.entity';
import { Therapist } from './therapist.entity';

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
  @OneToMany(() => Preference, preference => preference.level)
  preference: Preference[];

  @ApiProperty({type: () => Therapist})  
  @OneToMany(() => Therapist, therapist => therapist.level)
  therapist: Therapist[];

  @ApiProperty({type: () => Subscription})  
  @OneToMany(() => Subscription, subscription => subscription.level)
  subscription: Subscription[];
}
