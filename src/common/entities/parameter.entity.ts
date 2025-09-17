import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity } from "typeorm";
import { CommonEntity } from "./common.entity";

@Entity()
export class Parameter extends CommonEntity {

  @Column({ unique: true,nullable: false })
  @ApiProperty()
  name: string;

  @Column({ nullable: false })
  @ApiProperty()
  value: string;

}