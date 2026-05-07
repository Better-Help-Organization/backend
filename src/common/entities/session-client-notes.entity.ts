import { Column, Entity, ManyToOne } from "typeorm";
import { Client } from "./client.entity";
import { CommonEntity } from "./common.entity";
import { Session } from "./session.entity";

@Entity('session_client_notes')
export class SessionClientNotes extends CommonEntity {

  @ManyToOne(() => Session, session => session.clientNotes, {
    onDelete: 'CASCADE'
  })
  session: Session;

  @ManyToOne(() => Client, client => client.sessionNotes, {
    onDelete: 'CASCADE',
    eager: true
  })
  client: Client;

  @Column({ type: 'text', nullable: true })
  note: string;
}