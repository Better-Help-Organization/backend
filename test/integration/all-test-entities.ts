import { Admin } from 'src/common/entities/admin.entity';
import { Answer } from 'src/common/entities/answer.entity';
import { Availability } from 'src/common/entities/availability.entity';
import { Bank } from 'src/common/entities/bank.entity';
import { Chat } from 'src/common/entities/chat.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { DailyQuote } from 'src/common/entities/daily-quote.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Expertise } from 'src/common/entities/expertise.entity';
import { Language } from 'src/common/entities/language.entity';
import { Level } from 'src/common/entities/level.entity';
import { License } from 'src/common/entities/license.entity';
import { MatchTherapist } from 'src/common/entities/match-therapist.entity';
import { Match } from 'src/common/entities/match.entity';
import { Message } from 'src/common/entities/message.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Option } from 'src/common/entities/option.entity';
import { Parameter } from 'src/common/entities/parameter.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { Question } from 'src/common/entities/question.entity';
import { Quote } from 'src/common/entities/quote.entity';
import { Rating } from 'src/common/entities/rating.entity';
import { SessionClientNotes } from 'src/common/entities/session-client-notes.entity';
import { Session } from 'src/common/entities/session.entity';
import { Status } from 'src/common/entities/status.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { TherapistBank } from 'src/common/entities/therapist-bank.entity';
import { TherapistPaymentPeriod } from 'src/common/entities/therapist-payment-period.entity';
import { Therapist } from 'src/common/entities/therapist.entity';

export const ALL_TEST_ENTITIES = [
  Admin,
  Answer,
  Availability,
  Bank,
  Chat,
  Client,
  ClientSubscription,
  DailyQuote,
  Diary,
  Expertise,
  Language,
  Level,
  License,
  Match,
  MatchTherapist,
  Message,
  Modal,
  Mood,
  Note,
  Notification,
  Option,
  Parameter,
  Payment,
  Preference,
  Question,
  Quote,
  Rating,
  Session,
  SessionClientNotes,
  Status,
  Subscription,
  Therapist,
  TherapistBank,
  TherapistPaymentPeriod,
] as const;
