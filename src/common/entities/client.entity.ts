import { Entity, Column } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Client extends User {
  @Column({ nullable: true, unique:true })
  username: string;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column({ default: false })
  isVisible: boolean;
}
