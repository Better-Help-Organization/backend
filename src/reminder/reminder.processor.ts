import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Session } from 'src/common/entities/session.entity';
import { toEthiopianTime } from 'src/common/utils/toEthiopianTime';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Repository } from 'typeorm';
import { SessionNotif } from '../common/constants';

@Processor('session-reminders')
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
    const { sessionId } = job.data;

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['client', 'therapist', 'group'],
      select: {
        id: true,
        schedule: true,
        client: { id: true, firstName: true, firebaseToken: true },
        therapist: { id: true, firstName: true, firebaseToken: true },
      },
    });

    if (!session) {
      this.logger.warn(`Session ${sessionId} not found, skipping reminder`);
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