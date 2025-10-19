import { Column, Entity, ManyToOne } from "typeorm";
import { CommonEntity } from "./common.entity";
import { Quote } from "./quote.entity";

@Entity()
export class DailyQuote extends CommonEntity {

  @ManyToOne(() => Quote)
  quote: Quote;

  @Column({ type: 'date', unique: true })
  date: string; // e.g., '2025-10-17'
}
