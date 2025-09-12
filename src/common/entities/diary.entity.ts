import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, ManyToOne } from "typeorm";
import { Client } from "./client.entity";
import { CommonEntity } from "./common.entity";

@Entity()
export class Diary extends CommonEntity {

@ApiProperty({ nullable: true })
@Column({ type: 'text' })
title: string;

@ApiProperty({ nullable: true })
@Column({ type: 'text' })
content: string;

@ApiProperty({ type : () => Client})
@ManyToOne(() => Client, { 
nullable: true,
})
client: Client;
}
