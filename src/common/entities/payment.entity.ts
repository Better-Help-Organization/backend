import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne } from 'typeorm';
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
  @Column({ type: 'varchar', nullable: true })
  receipt: string;

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
  @ManyToOne(() => ClientSubscription, (sub) => sub.payment, { onDelete: 'CASCADE' })
  subscription: ClientSubscription;
}
