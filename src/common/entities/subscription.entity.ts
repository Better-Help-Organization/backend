import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { SubscriptionStatus, SubscriptionType } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Level } from './level.entity';
import { Payment } from './payment.entity';

@Entity()
export class Subscription extends CommonEntity{
    @ApiProperty({
    enum: SubscriptionType,
    description: '0 = trial, 1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = yearly'
    })
    @Column({ type: 'enum', enum: SubscriptionType })
    type: SubscriptionType;

    @ApiProperty({ enum: SubscriptionStatus, description: 'Current subscription status' })
    @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.INACTIVE })
    status: SubscriptionStatus;

    @ApiProperty({ example: '2025-08-28', description: 'Start date of subscription' })
    @Column({ type: 'date' })
    start_date: Date;

    @ApiProperty({ example: '2025-09-28', description: 'End date of subscription' })
    @Column({ type: 'date', nullable: true })
    end_date: Date;

    @ApiProperty({ example: 580, description: 'Original (old) price before discount' })
    @Column('int')
    old_price: number;

    @ApiProperty({ example: 499, description: 'Discounted price (if applicable)' })
    @Column('int', { nullable: true })
    price: number;

    @ApiProperty({ type: () => Client, description: 'Associated client that made the subscription' })
    @ManyToOne(() => Client, (client) => client.subscription, { onDelete: 'CASCADE' })
    client: Client;

    @ApiProperty({ type: () => Level, description: 'Associated therapist level for subscription' })
    @ManyToOne(() => Level, (level) => level.subscription, { eager: true })
    level: Level;

    @ApiProperty({ type: () => [Payment], description: 'Payments linked to this subscription' })
    @OneToMany(() => Payment, (payment) => payment.subscription, { cascade: true })
    payment: Payment[];
}
