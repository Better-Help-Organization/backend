import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { ApprovalStatus, SessionNotif } from 'src/common/constants';
import { Client } from 'src/common/entities/client.entity';
import { Session } from 'src/common/entities/session.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { In, Repository } from 'typeorm';
import { PENDING_SESSION_EXPIRY_JOB, SESSION_LIFECYCLE_QUEUE } from './reminder.constants';

@Processor(SESSION_LIFECYCLE_QUEUE)
export class SessionLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionLifecycleProcessor.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly firebaseService: FirebaseService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name !== PENDING_SESSION_EXPIRY_JOB) {
      this.logger.warn(`Unknown session lifecycle job ${job.name}`);
      return;
    }

    const { sessionIds = [] } = job.data as { sessionIds?: string[] };
    if (!sessionIds.length) {
      this.logger.warn('Pending expiry batch job has no session ids');
      return;
    }

    const sessions = await this.sessionRepo.find({
      where: { id: In(sessionIds) },
      relations: ['client'],
    });

    if (!sessions.length) {
      this.logger.warn('No sessions found for pending expiry batch, skipping');
      return;
    }

    const pendingSessions = sessions.filter(
      (session) => session.approvalStatus === ApprovalStatus.PENDING,
    );

    if (!pendingSessions.length) {
      this.logger.log('All sessions in pending expiry batch have already been resolved');
      return;
    }

    await this.sessionRepo.remove(pendingSessions);

    const uniqueClientIds = [...new Set(pendingSessions.map((session) => session.client?.id).filter(Boolean))];
    await Promise.all(
      uniqueClientIds.map((clientId) => this.clientRepo.update(clientId, { hasNotification: null })),
    );

    for (const session of pendingSessions) {
      const client = session.client;

      if (client?.firebaseToken) {
        await this.firebaseService.sendPushNotification(
          { client: [client.firebaseToken], therapist: [], admin: [] },
          'Pending session removed',
          SessionNotif.PENDING_SESSION_DELETED,
          `Your pending session scheduled on ${session.schedule.toDateString()} was automatically removed due to inactivity.`,
        );
      }
    }

    this.logger.log(`Expired ${pendingSessions.length} pending session(s) from batch`);
  }
}
