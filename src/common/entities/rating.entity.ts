import { Entity, Column, ManyToOne, Unique, Check } from 'typeorm';
import { Therapist } from './therapist.entity';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_RATING, MIN_RATING } from '../constants';

@Unique(['client', 'therapist'])
@Entity()
export class Rating extends CommonEntity {
  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.rating, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  therapist: Therapist;

  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.rating, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  client: Client;

  @ApiProperty({
  example: MAX_RATING,
  description: `Rating value between ${MIN_RATING} and ${MAX_RATING}`,
  })
  @Column({ type: 'int' })
  @Check(`"value" >= ${MIN_RATING} AND "value" <= ${MAX_RATING}`)
  value: number;

  @ApiProperty({ example: 'Great experience', required: false })
  @Column({ type: 'text', nullable: true })
  comment?: string;
}
