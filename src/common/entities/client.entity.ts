import { Entity, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Preference } from './preference.entity';
import { Answer } from './answer.entity';

@Entity()
export class Client extends User {
  @Column({ nullable: true, unique:true })
  username: string;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column({ default: false })
  isVisible: boolean;

  @OneToMany(() => Preference, preference => preference.client)
  preferences: Preference[];

  @OneToMany(() => Answer, answer => answer.client)
  answers: Answer[];
}
