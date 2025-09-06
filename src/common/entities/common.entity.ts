import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export class CommonEntity {
  
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // @Column({ select:false, type: 'timestamp', nullable: true, onUpdate: 'CURRENT_TIMESTAMP', default: () => 'CURRENT_TIMESTAMP' })
  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  // @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @DeleteDateColumn({select:false,}) // This column will store the date when the record is soft-deleted
  deletedAt: Date;
}
