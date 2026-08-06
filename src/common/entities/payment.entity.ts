import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../constants';
import { ClientSubscription } from './client-subscription.entity';
import { CommonEntity } from './common.entity';

@Entity()
export class Payment extends CommonEntity {
  @ApiProperty({ example: 499.99, description: 'Payment amount' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ example: '2025-09-18T14:32:00Z', description: 'Date and time of payment' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ example: 'https://payments.example.com/receipt/12345', description: 'Receipt URL or reference' })
  @Column({ type: 'text', nullable: true })
  receipt: string;

  @ApiProperty({ example: '1705460512562', required: false, description: 'Gateway-side merchant order id' })
  @Column({ type: 'varchar', nullable: true })
  providerOrderId: string;

  @ApiProperty({ example: '080075a4e3213924de2b3b84ad3cac0a6a6001', required: false, description: 'Gateway prepay reference' })
  @Column({ type: 'varchar', nullable: true })
  providerPrepayId: string;

  @ApiProperty({ example: '11801107AD19191408215009', required: false, description: 'Gateway transaction id' })
  @Column({ type: 'varchar', nullable: true })
  providerTransactionId: string;

  @ApiProperty({ example: 'c2a5ec85-79e1-4439-b149-e763bd4c32f8', required: false, description: 'Associated ClientSubscription id' })
  @Column({ type: 'varchar', nullable: true })
  subscriptionId: string;

  @ApiProperty({ required: false, description: 'Latest raw gateway payload kept for reconciliation/debugging' })
  @Column({ type: 'simple-json', nullable: true })
  providerPayload: Record<string, any>;

  @ApiProperty({
    example: '123_456_789.pdf',
    required: false,
    description: 'Filename of the uploaded payment document',
  })
  @Column({ nullable: true })
  filename: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ type: () => ClientSubscription, description: 'Associated ClientSubscription for this payment' })
  @JoinColumn({ name: 'subscriptionId' })
  @ManyToOne(() => ClientSubscription, (sub) => sub.payment, { onDelete: 'CASCADE' })
  subscription: ClientSubscription;
}
