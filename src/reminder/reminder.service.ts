import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Session } from 'src/common/entities/session.entity';

export const REMINDER_DELAYS = [
  { minutes: 1440, jobSuffix: '24h' },
  { minutes: 120,  jobSuffix: '2h'  },
  { minutes: 15,   jobSuffix: '15m' },
];

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectQueue('session-reminders') private readonly reminderQueue: Queue,
  ) {}

  async scheduleReminders(session: Session) {
    const now = Date.now();

    for (const { minutes, jobSuffix } of REMINDER_DELAYS) {
      const fireAt = new Date(session.schedule).getTime() - minutes * 60_000;
      const delay = fireAt - now;

      if (delay <= 0) continue; // already past, skip

      const jobId = `reminder:${session.id}:${jobSuffix}`;

      await this.reminderQueue.add(
        'send-reminder',
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
      const job = await this.reminderQueue.getJob(`reminder:${sessionId}:${jobSuffix}`);
      if (job) await job.remove();
    }
    this.logger.log(`Cancelled all reminders for session ${sessionId}`);
  }
}