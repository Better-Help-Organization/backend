import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';
import { Therapist } from './therapist.entity';

@Entity()
export class TherapistPaymentPeriod extends CommonEntity {
  @ManyToOne(() => Therapist)
  therapist: Therapist;

  @Column({ type: 'timestamp'  })
  startDate: string;

  @Column({ type: 'timestamp'  })
  endDate: string;

  @Column({ type: 'float' })
  totalRevenue: number;

  @OneToMany(() => Session, session => session.paymentPeriod, {
    cascade: true,     // optional — auto save when period saves
    eager: false,      // keep false unless you want auto-loading
  })
  session: Session[];

}
