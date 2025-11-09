import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { SubscriptionType } from '../constants';
import { ClientSubscription } from './client-subscription.entity';
import { CommonEntity } from './common.entity';
import { Level } from './level.entity';
import { Modal } from './modal.entity';

@Entity()
export class Subscription extends CommonEntity{
    @ApiProperty({
    enum: SubscriptionType,
    description: '0 = trial, 1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = yearly'
    })
    @Column({ type: 'enum', enum: SubscriptionType })
    type: SubscriptionType;

    @ApiProperty({ example: 580, description: 'Original (old) price before discount' })
    @Column('int',  { nullable: true })
    old_price: number;

    @ApiProperty({ example: 499, description: 'Discounted price (if applicable)' })
    @Column('int', { nullable: true })
    price: number;

    @ApiProperty({ type: () => ClientSubscription, isArray: true })
    @OneToMany(() => ClientSubscription, cs => cs.subscription)
    client: ClientSubscription[];

    @ApiProperty({ type: () => Modal, description: 'Associated therapy modal for subscription' })
    @ManyToOne(() => Modal, (modal) => modal.subscription, { nullable:true, eager: true })
    modal: Modal;

    @ApiProperty({ type: () => Level, description: 'Associated therapist level for subscription' })
    @ManyToOne(() => Level, (level) => level.subscription, { eager: true })
    level: Level;

    @ApiProperty({ example: false, description: 'Indicates if this subscription was created by an admin' })
    @Column({ type: 'boolean', default: false })
    is_admin_created: boolean;
}
