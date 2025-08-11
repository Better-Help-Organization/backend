import { Column, DeleteDateColumn, PrimaryGeneratedColumn } from "typeorm";

export class CommonEntity {
  
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ select:false, type: 'timestamp', nullable: true, onUpdate: 'CURRENT_TIMESTAMP', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn({select:false,}) // This column will store the date when the record is soft-deleted
  deletedAt: Date;
}
