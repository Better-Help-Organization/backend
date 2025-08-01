import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { CommonEntity } from "./common.entity";
import { Modal } from "./modal.entity";
import { Therapist } from "./therapist.entity";

@Unique(['therapist', 'modal'])
@Entity('license')
export class License extends CommonEntity {
  @ApiProperty({ type: () => Modal })
  @ManyToOne(() => Modal, modal => modal.license, { nullable: false, onDelete: 'CASCADE' })
  modal: Modal;

  @ApiProperty({ type: () => Therapist })
  @ManyToOne(() => Therapist, therapist => therapist.license, { nullable: false, onDelete: 'CASCADE' })
  therapist: Therapist;

  @ApiProperty({ example: '1234-ABCD', description: 'Unique license number' })
  @Column({ unique: true })
  license_number: string;

  @ApiProperty({ example: 'California' })
  @Column()
  region: string;

  @ApiProperty({ example: '2025-12-31', type: String, format: 'date' })
  @Column({ type: 'date' })
  expiration_date: Date;

  @ApiProperty({ example: false, default: false })
  @Column({ default: false })
  verified: boolean;

  @ApiProperty({
    example: '123_456_789.pdf',
    required: false,
    description: 'Filename of the uploaded license document',
  })
  @Column({ nullable: true })
  filename: string;
}
