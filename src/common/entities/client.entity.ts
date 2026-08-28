import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne } from 'typeorm';
import { BaseStatus } from '../constants';
import { Answer } from './answer.entity';
import { Chat } from './chat.entity';
import { ClientSubscription } from './client-subscription.entity';
import { Diary } from './diary.entity';
import { Language } from './language.entity';
import { Match } from './match.entity';
import { Mood } from './mood.entity';
import { Notification } from './notification.entity';
import { Preference } from './preference.entity';
import { Rating } from './rating.entity';
import { SessionClientNotes } from './session-client-notes.entity';
import { Session } from './session.entity';
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

  @ApiProperty()
  @Column({ default: false })
  isInGroup: boolean;

  @ApiProperty({ enum: BaseStatus, default: BaseStatus.INACTIVE })
  @Column({
      type: "enum",
      default: BaseStatus.ACTIVE,
      enum: BaseStatus,
  })
  status: BaseStatus;

  @ApiProperty({ type: () => Preference })
  @OneToMany(() => Preference, preference => preference.client)
  preference: Preference[];

  @ApiProperty({ type: () => Answer })
  @OneToMany(() => Answer, answer => answer.client)
  answer: Answer[];

  @ApiProperty({ type: () => Rating })
  @OneToMany(() => Rating, rating => rating.client)
  rating: Rating[];

  @ApiProperty({ type: () => Match })
  @OneToMany(() => Match, match => match.client)
  match: Match[];

  @ApiProperty({ type: () => Mood })
  @OneToMany(() => Mood, mood => mood.client)
  moods: Mood[];

  @ApiProperty({ type: () => Diary })
  @OneToMany(() => Diary, diary => diary.client)
  diary: Diary[];

  @ApiProperty({ type: () => ClientSubscription, isArray: true })
  @OneToMany(() => ClientSubscription, cs => cs.client)
  subscription: ClientSubscription[];

  @ApiProperty({ type: () => ClientSubscription })
  @OneToOne(() => ClientSubscription, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_subscription_id' })
  activeSubscription?: ClientSubscription;

  @ApiProperty({ type: () => Notification, nullable: true })
  @OneToOne(() => Notification, { nullable: true, cascade: true })
  @JoinColumn()
  hasNotification?: Notification | null;

  @ApiProperty({ type: () => Chat, isArray: true })
  @ManyToMany(() => Chat, chat => chat.group)
  chats: Chat[];

  @ApiProperty({ type: () => [Language] })
  @ManyToMany(() => Language, language => language.client)
  @JoinTable()
  language: Language[];

  @ApiProperty({ type: () => Session, isArray: true })
  @OneToMany(() => Session, ss => ss.client)
  session: Session[];

  @OneToMany(() => SessionClientNotes, (n) => n.client)
  sessionNotes: SessionClientNotes[];
  
}
