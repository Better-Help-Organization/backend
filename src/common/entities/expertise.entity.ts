import { Column, Entity, ManyToOne } from "typeorm";
import { ExpertiseValues } from "../constants";
import { CommonEntity } from "./common.entity";
import { Therapist } from "./therapist.entity";

@Entity()
export class Expertise extends CommonEntity {

  @ManyToOne(() => Therapist, therapist => therapist.expertise)
  therapist: Therapist;

  @Column({
    type: "enum",
    enum: ExpertiseValues,
  })
  expertise: ExpertiseValues;

}
