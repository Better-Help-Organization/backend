import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

@Entity()
export class Notification extends CommonEntity {

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'text', nullable: true })
  profile: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, { nullable: true })
  client?: Client;

  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, { nullable: true })
  therapist?: Therapist;

  @ApiProperty({ default: false, description: "Whether the notification has seen" })
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

}
