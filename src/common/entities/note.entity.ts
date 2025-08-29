import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  ManyToOne
} from 'typeorm';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

@Entity('note')
export class Note extends CommonEntity {

  // @ApiProperty({ type: () => Session })s
  // @ManyToOne(() => Session, { nullable: false, onDelete: 'CASCADE' })
  // session: Session;

  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, { nullable: false })
  therapist: Therapist;

@ApiProperty({ nullable: true })
  @Column({ type: 'text' })
  content: string;
}
