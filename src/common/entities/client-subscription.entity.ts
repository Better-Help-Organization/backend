import { ApiProperty } from '@nestjs/swagger';
import { Entity, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Payment } from './payment.entity';
import { Subscription } from './subscription.entity';

@Entity()
@Unique(['client', 'subscription']) // prevent duplicates
export class ClientSubscription extends CommonEntity {
  
  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.subscription, { onDelete: 'CASCADE' })
  client: Client;

  @ApiProperty({ type: () => Subscription })
  @ManyToOne(() => Subscription, subscription => subscription.client, { onDelete: 'CASCADE' })
  subscription: Subscription;

  @ApiProperty({ type: () => Payment, isArray: true })
  @OneToMany(() => Payment, payment => payment.subscription, { cascade: true })
  payment: Payment[];
}
