import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity } from "typeorm";
import { CommonEntity } from "./common.entity";


@Entity()
export class Quote extends CommonEntity {

@ApiProperty({ nullable: true })
@Column({ type: 'text' })
content: string;


@ApiProperty()
@Column({ default: "Anonymus" })
author: string;

}
