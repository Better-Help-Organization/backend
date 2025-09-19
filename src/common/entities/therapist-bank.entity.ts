import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { Bank } from './bank.entity';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

@Entity()
@Unique(['therapist', 'bank']) // prevents duplicates per therapist
export class TherapistBank extends CommonEntity {
  @ManyToOne(() => Therapist, therapist => therapist.therapistBank, { onDelete: 'CASCADE' })
  therapist: Therapist;

  @ManyToOne(() => Bank, bank => bank.therapistBank)
  bank: Bank;

  @Column({ type: 'varchar', length: 100 })
  accountNumber: string;

  @Column({ nullable: true })
  branch?: string;

}
