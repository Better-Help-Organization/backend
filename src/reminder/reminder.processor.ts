import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { ApprovalStatus, SessionNotif, SessionStatus } from 'src/common/constants';
import { Session } from 'src/common/entities/session.entity';
import { toEthiopianTime } from 'src/common/utils/toEthiopianTime';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Repository } from 'typeorm';
import { SESSION_REMINDER_JOB, SESSION_REMINDERS_QUEUE } from './reminder.constants';

@Processor(SESSION_REMINDERS_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly firebaseService: FirebaseService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== SESSION_REMINDER_JOB) {
      this.logger.warn(`Unknown reminder job ${job.name}`);
      return;
    }

    const { sessionId } = job.data;

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['client', 'therapist', 'group'],
      select: {
        id: true,
        schedule: true,
        approvalStatus: true,
        latestStatus: true,
        client: { id: true, firstName: true, firebaseToken: true },
        therapist: { id: true, firstName: true, firebaseToken: true },
        group: { id: true, firstName: true, firebaseToken: true },
      },
    });

    if (!session) {
      this.logger.warn(`Session ${sessionId} not found, skipping reminder`);
      return;
    }

    if (session.approvalStatus !== ApprovalStatus.CONFIRMED) {
      this.logger.log(`Session ${sessionId} is not confirmed, skipping reminder`);
      return;
    }

    if (
      session.latestStatus === SessionStatus.CANCELED ||
      session.latestStatus === SessionStatus.COMPLETED
    ) {
      this.logger.log(`Session ${sessionId} is ${session.latestStatus}, skipping reminder`);
      return;
    }

    const etTime = toEthiopianTime(session.schedule);

    // collect all client tokens (1-on-1 + group)
    const clientTokens = [
      session.client?.firebaseToken,
      ...(session.group ?? []).map(c => c.firebaseToken),
    ].filter(Boolean);

    await Promise.all([
      // clients
      clientTokens.length && this.firebaseService.sendPushNotification(
        { client: clientTokens, therapist: [], admin: [] },
        'SESSION',
        SessionNotif.SESSION_REMINDER_CLIENT,
        `Reminder: You have a session with ${session.therapist?.firstName ?? 'your therapist'} at ${etTime}`,
      ),
      // therapist
      session.therapist?.firebaseToken && this.firebaseService.sendPushNotification(
        { client: [], therapist: [session.therapist.firebaseToken], admin: [] },
        'SESSION',
        SessionNotif.SESSION_REMINDER_THERAPIST,
        `Reminder: You have a session with ${session.client?.firstName ?? 'a client'} at ${etTime}`,
      ),
    ]);

    this.logger.log(`Sent reminder for session ${sessionId}`);
  }
}
