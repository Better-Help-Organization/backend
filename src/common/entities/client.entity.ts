import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Answer } from './answer.entity';
import { ClientSubscription } from './client-subscription.entity';
import { Diary } from './diary.entity';
import { Match } from './match.entity';
import { Mood } from './mood.entity';
import { Preference } from './preference.entity';
import { Rating } from './rating.entity';
import { Subscription } from './subscription.entity';
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

  @ApiProperty({ type: () => Subscription })
  @OneToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'active_subscription_id' })
  activeSubscription?: Subscription;
}
