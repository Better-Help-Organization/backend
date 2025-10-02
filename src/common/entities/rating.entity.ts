import { ApiProperty } from '@nestjs/swagger';
import { Check, Column, Entity, ManyToOne, Unique } from 'typeorm';
import { MAX_RATING, MIN_RATING } from '../constants';
import { Client } from './client.entity';
import { CommonEntity } from './common.entity';
import { Therapist } from './therapist.entity';

@Unique(['client', 'therapist'])
@Entity()
export class Rating extends CommonEntity {
  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.rating, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: true
  })
  therapist: Therapist;

  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, client => client.rating, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: true
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
