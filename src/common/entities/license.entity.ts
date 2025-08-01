import { Column, Entity, ManyToOne, Unique } from "typeorm";
import { CommonEntity } from "./common.entity";
import { Modal } from "./modal.entity";
import { Therapist } from "./therapist.entity";

@Unique(['therapist', 'modal'])
@Entity('license')
export class License extends CommonEntity {
  @ManyToOne(() => Modal, modal => modal.license, { nullable: false, onDelete: 'CASCADE' })
  modal: Modal;

  @ManyToOne(() => Therapist, therapist => therapist.license, { nullable: false, onDelete: 'CASCADE' })
  therapist: Therapist;

  @Column({unique: true})
  license_number: string;

  @Column()
  region: string;

  @Column({ type: 'date' })
  expiration_date: Date;

  @Column({ default: false })
  verified: boolean;
}
