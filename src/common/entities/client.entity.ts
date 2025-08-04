import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { Answer } from './answer.entity';
import { Preference } from './preference.entity';
import { User } from './user.entity';

@Entity()
export class Client extends User {

  @ApiProperty({ nullable: true })
  @Column({ nullable: true, unique:true })
  username: string;

  @ApiProperty({ nullable: true })
  @Column({ nullable: true })
  emergencyContact: string;

  @ApiProperty({ nullable: true })
  @Column({ default: false })
  isVisible: boolean;

  @ApiProperty({ type: () => Preference })
  @OneToMany(() => Preference, preference => preference.client)
  preference: Preference[];

  @ApiProperty({ type: () => Answer })
  @OneToMany(() => Answer, answer => answer.client)
  answer: Answer[];

  // @ApiProperty({ type: () => Session })
  // @ManyToMany(() => Session, session => session.group)
  // groupSessions: Session[];
}
