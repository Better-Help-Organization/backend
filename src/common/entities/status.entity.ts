import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  ManyToOne,
} from 'typeorm';
import { SessionStatus } from '../constants';
import { CommonEntity } from './common.entity';
import { Session } from './session.entity';



@Entity('status')
export class Status extends CommonEntity {

  @ApiProperty({ type: () => Session })
  @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  session: Session;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: SessionStatus,
  })
  status: SessionStatus;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  reason: string;
}
