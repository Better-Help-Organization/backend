import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DefaultParameters } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Session } from 'src/common/entities/session.entity';
import { ParameterService } from 'src/parameter/parameter.service';
import {
  PENDING_SESSION_EXPIRY_JOB,
  REMINDER_DELAYS,
  SESSION_LIFECYCLE_QUEUE,
  SESSION_REMINDER_JOB,
  SESSION_REMINDERS_QUEUE,
  SUBSCRIPTION_EXPIRY_DAY_JOB,
  SUBSCRIPTION_EXPIRY_REMINDER_JOB,
} from './reminder.constants';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectQueue(SESSION_REMINDERS_QUEUE) private readonly reminderQueue: Queue,
    @InjectQueue(SESSION_LIFECYCLE_QUEUE) private readonly lifecycleQueue: Queue,
    private readonly paramService: ParameterService,
  ) {}

  async scheduleReminders(session: Session) {
    const now = Date.now();

    for (const { minutes, jobSuffix } of REMINDER_DELAYS) {
      const fireAt = new Date(session.schedule).getTime() - minutes * 60_000;
      const delay = fireAt - now;

      if (delay <= 0) continue; // already past, skip

      const jobId = `reminder--${session.id}--${jobSuffix}`;

      await this.reminderQueue.add(
        SESSION_REMINDER_JOB,
        {
          sessionId: session.id,
          minutesBefore: minutes,
        },
        {
          jobId,       // idempotent — adding same jobId twice is a no-op
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`Scheduled ${jobSuffix} reminder for session ${session.id}`);
    }
  }

  async cancelReminders(sessionId: string) {
    for (const { jobSuffix } of REMINDER_DELAYS) {
      const job = await this.reminderQueue.getJob(`reminder--${sessionId}--${jobSuffix}`);
      if (job) await job.remove();
    }
    this.logger.log(`Cancelled all reminders for session ${sessionId}`);
  }

  async schedulePendingSessionExpiry(sessions: Session[]) {
    if (!sessions.length) return;

    const expiryInMinutes = await this.paramService.getDefaultByName(
      DefaultParameters.PENDING_SESSION_EXPIRY_IN_MINUTES,
    );
    const baseSession = sessions[0];
    const baseTime = baseSession.createdAt ? new Date(baseSession.createdAt).getTime() : Date.now();
    const fireAt = baseTime + Number(expiryInMinutes) * 60_000;
    const delay = fireAt - Date.now();

    if (delay <= 0) return;

    const batchId = baseSession.commonId ?? sessions.map((session) => session.id).sort().join('--');
    await this.lifecycleQueue.add(
      PENDING_SESSION_EXPIRY_JOB,
      {
        sessionIds: sessions.map((session) => session.id),
      },
      {
        jobId: `pending-expiry-batch--${batchId}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Scheduled pending expiry batch for ${sessions.length} session(s)`);
  }

  async scheduleSubscriptionExpiryNotifications(subscription: ClientSubscription) {
    if (!subscription?.id || !subscription.end_date) return;

    const subscriptionEnd = new Date(subscription.end_date);
    if (Number.isNaN(subscriptionEnd.getTime())) return;

    const sevenDayReminderAt = new Date(subscriptionEnd);
    sevenDayReminderAt.setDate(sevenDayReminderAt.getDate() - 7);
    sevenDayReminderAt.setHours(0, 0, 0, 0);

    const expiryDayAt = new Date(subscriptionEnd);
    expiryDayAt.setHours(23, 59, 0, 0);

    await this.cancelSubscriptionExpiryNotifications(subscription.id);

    const jobs = [
      {
        jobName: SUBSCRIPTION_EXPIRY_REMINDER_JOB,
        jobId: `subscription-expiry-reminder--${subscription.id}`,
        runAt: sevenDayReminderAt,
      },
      {
        jobName: SUBSCRIPTION_EXPIRY_DAY_JOB,
        jobId: `subscription-expiry-day--${subscription.id}`,
        runAt: expiryDayAt,
      },
    ];

    for (const { jobName, jobId, runAt } of jobs) {
      const delay = runAt.getTime() - Date.now();
      if (delay <= 0) continue;

      await this.lifecycleQueue.add(
        jobName,
        { subscriptionId: subscription.id },
        {
          jobId,
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    this.logger.log(`Scheduled subscription expiry notifications for ${subscription.id}`);
  }

  async cancelSubscriptionExpiryNotifications(subscriptionId: string) {
    const jobIds = [
      `subscription-expiry-reminder--${subscriptionId}`,
      `subscription-expiry-day--${subscriptionId}`,
    ];

    for (const jobId of jobIds) {
      const job = await this.lifecycleQueue.getJob(jobId);
      if (job) await job.remove();
    }
  }
}
