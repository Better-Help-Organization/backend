import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { SessionNotif, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { SessionClientNotes } from 'src/common/entities/session-client-notes.entity';
import { Session } from 'src/common/entities/session.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Repository } from 'typeorm';
import {
  SESSION_LIFECYCLE_QUEUE,
  SUBSCRIPTION_EXPIRY_DAY_JOB,
  SUBSCRIPTION_EXPIRY_REMINDER_JOB,
  THERAPIST_NOTE_REMINDER_JOB,
} from './reminder.constants';

@Processor(SESSION_LIFECYCLE_QUEUE)
export class SubscriptionLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionLifecycleProcessor.name);

  constructor(
    @InjectRepository(ClientSubscription)
    private readonly clientSubscriptionRepo: Repository<ClientSubscription>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(SessionClientNotes)
    private readonly sessionClientNotesRepo: Repository<SessionClientNotes>,
    private readonly firebaseService: FirebaseService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === THERAPIST_NOTE_REMINDER_JOB) {
      await this.processTherapistNoteReminder(job);
      return;
    }

    if (job.name !== SUBSCRIPTION_EXPIRY_REMINDER_JOB && job.name !== SUBSCRIPTION_EXPIRY_DAY_JOB) {
      return;
    }

    const { subscriptionId } = job.data as { subscriptionId?: string };
    if (!subscriptionId) {
      this.logger.warn(`Subscription lifecycle job ${job.id} has no subscription id`);
      return;
    }

    const subscription = await this.clientSubscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['client'],
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found, skipping lifecycle job`);
      return;
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE || !subscription.end_date) {
      this.logger.log(`Subscription ${subscriptionId} is no longer active, skipping lifecycle job`);
      return;
    }

    const token = subscription.client?.firebaseToken;
    if (!token) {
      this.logger.log(`Subscription ${subscriptionId} client has no firebase token`);
      return;
    }

    if (job.name === SUBSCRIPTION_EXPIRY_REMINDER_JOB) {
      await this.firebaseService.sendPushNotification(
        { client: [token], therapist: [], admin: [] },
        'EXPIRY',
        SessionNotif.SUBSCRIPTION_EXPIRY,
        `Your subscription will expire on ${subscription.end_date}.`,
      );

      this.logger.log(`Sent 7-day expiry reminder for subscription ${subscriptionId}`);
      return;
    }

    await this.firebaseService.sendPushNotification(
      { client: [token], therapist: [], admin: [] },
      'SUBSCRIPTION EXPIRED',
      SessionNotif.SUBSCRIPTION_EXPIRED,
      'Your subscription has expired today. Renew now to continue your sessions.',
    );

    this.logger.log(`Sent expiry-day notification for subscription ${subscriptionId}`);
  }

  private async processTherapistNoteReminder(job: Job) {
    const { sessionId } = job.data as { sessionId?: string };
    if (!sessionId) {
      this.logger.warn(`Therapist note reminder job ${job.id} has no session id`);
      return;
    }

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['therapist', 'client', 'group', 'clientNotes'],
    });

    if (!session) {
      this.logger.warn(`Session ${sessionId} not found, skipping therapist note reminder`);
      return;
    }

    if (!session.therapist?.firebaseToken) return;
    if (!session.hasTherapistAttended) return;

    const hasIndividualNote = !!session.note?.trim();
    const clientNotesCount = session.clientNotes?.filter((note) => !!note.note?.trim()).length ?? 0;
    const groupSize = session.group?.length ?? 0;
    const hasCompletedGroupNotes = groupSize > 0 && clientNotesCount >= groupSize;

    if (hasIndividualNote || hasCompletedGroupNotes) {
      this.logger.log(`Session ${sessionId} already has notes, skipping therapist reminder`);
      return;
    }

    const sessionLabel = session.client
      ? `${session.client.firstName ?? ''} ${session.client.lastName ?? ''}`.trim() || 'your client'
      : session.groupName || 'your group session';

    await this.firebaseService.sendPushNotification(
      { client: [], therapist: [session.therapist.firebaseToken], admin: [] },
      JSON.stringify({ sessionId: session.id }),
      SessionNotif.THERAPIST_NOTES,
      `Don’t forget to write notes for ${sessionLabel}.`,
    );

    this.logger.log(`Sent therapist note reminder for session ${sessionId}`);
  }
}
