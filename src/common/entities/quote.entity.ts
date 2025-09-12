import { ApiProperty } from "@nestjs/swagger";
import { Column } from "typeorm";
import { CommonEntity } from "./common.entity";

export class Quote extends CommonEntity {

@ApiProperty({ nullable: true })
@Column({ type: 'text' })
content: string;

}
