import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { SubscriptionStatus, SubscriptionType } from '../constants';
import { ClientSubscription } from './client-subscription.entity';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Level } from './level.entity';

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
    @Column('int',  { nullable: true })
    old_price: number;

    @ApiProperty({ example: 499, description: 'Discounted price (if applicable)' })
    @Column('int', { nullable: true })
    price: number;

    @ApiProperty({ type: () => ClientSubscription, isArray: true })
    @OneToMany(() => ClientSubscription, cs => cs.subscription)
    client: ClientSubscription[];

    @ApiProperty({ type: () => Client })
    @OneToOne(() => Client, client => client.activeSubscription, { nullable: true, onDelete: 'CASCADE' })
    activeForClient?: Client;

    @ApiProperty({ type: () => Level, description: 'Associated therapist level for subscription' })
    @ManyToOne(() => Level, (level) => level.subscription, { eager: true })
    level: Level;
}
