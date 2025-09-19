import { Column, Entity, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { TherapistBank } from './therapist-bank.entity';

@Entity()
export class Bank extends CommonEntity {

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ default: false })
  optional: boolean; // false = required, true = optional


  @OneToMany(() => TherapistBank, tb => tb.bank)
  therapistBank: TherapistBank[];

}
