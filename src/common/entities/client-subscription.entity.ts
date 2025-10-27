import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { SubscriptionStatus } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Payment } from './payment.entity';
import { Session } from './session.entity';
import { Subscription } from './subscription.entity';
import { Therapist } from './therapist.entity';

@Entity()
@Unique(['client', 'subscription']) // prevent duplicates
export class ClientSubscription extends CommonEntity {
  
  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.subscription, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.subscription, { onDelete: 'CASCADE', eager: true  })
  therapist: Therapist;

  @ApiProperty({ type: () => Subscription })
  @ManyToOne(() => Subscription, subscription => subscription.client, { onDelete: 'CASCADE', eager: true })
  subscription: Subscription;

  @ApiProperty({ type: () => Payment, isArray: true })
  @OneToMany(() => Payment, payment => payment.subscription, { cascade: true })
  payment: Payment[];

  @ApiProperty({ type: () => Session, isArray: true })
  @OneToMany(() => Session, session => session.subscription, { cascade: true, eager: true })
  session: Session[];

  @ApiProperty({ enum: SubscriptionStatus, description: 'Current subscription status' })
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.INACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({ example: '2025-08-28', description: 'Start date of subscription' })
  @Column({ type: 'date', nullable:true })
  start_date: Date;

  @ApiProperty({ example: '2025-09-28', description: 'End date of subscription' })
  @Column({ type: 'date', nullable: true })
  end_date: Date;

  // @Expose()
  // get type() {
  //   return this.subscription?.type ?? null;
  // }

  
}
