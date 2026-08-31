import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { DefaultParameters } from 'src/common/constants';
import { ParameterService } from 'src/parameter/parameter.service';
import {
  PENDING_SESSION_EXPIRY_JOB,
  REMINDER_DELAYS,
  SESSION_LIFECYCLE_QUEUE,
  SESSION_REMINDER_JOB,
  SESSION_REMINDERS_QUEUE,
  pendingExpiryJobId,
  reminderJobId,
} from './reminder.constants';
import { ReminderService } from './reminder.service';

describe('ReminderService', () => {
  let service: ReminderService;
  let reminderQueue: { add: jest.Mock; getJob: jest.Mock };
  let lifecycleQueue: { add: jest.Mock; getJob: jest.Mock };
  let paramService: { getDefaultByName: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T12:00:00.000Z'));

    reminderQueue = { add: jest.fn(), getJob: jest.fn() };
    lifecycleQueue = { add: jest.fn(), getJob: jest.fn() };
    paramService = { getDefaultByName: jest.fn().mockResolvedValue(60) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        { provide: getQueueToken(SESSION_REMINDERS_QUEUE), useValue: reminderQueue },
        { provide: getQueueToken(SESSION_LIFECYCLE_QUEUE), useValue: lifecycleQueue },
        { provide: ParameterService, useValue: paramService },
      ],
    }).compile();

    service = module.get(ReminderService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues 24h, 2h, and 15m reminder jobs with stable ids', async () => {
    const session = {
      id: 'session-1',
      schedule: new Date('2026-08-31T14:00:00.000Z'),
    } as any;

    await service.scheduleReminders(session);

    expect(reminderQueue.add).toHaveBeenCalledTimes(3);
    for (const { minutes, jobSuffix } of REMINDER_DELAYS) {
      expect(reminderQueue.add).toHaveBeenCalledWith(
        SESSION_REMINDER_JOB,
        { sessionId: 'session-1', minutesBefore: minutes },
        expect.objectContaining({
          jobId: reminderJobId('session-1', jobSuffix),
          delay: expect.any(Number),
        }),
      );
    }
  });

  it('skips reminder offsets that are already in the past', async () => {
    const session = {
      id: 'session-1',
      schedule: new Date('2026-08-30T13:00:00.000Z'),
    } as any;

    await service.scheduleReminders(session);

    expect(reminderQueue.add).toHaveBeenCalledTimes(1);
    expect(reminderQueue.add).toHaveBeenCalledWith(
      SESSION_REMINDER_JOB,
      { sessionId: 'session-1', minutesBefore: 15 },
      expect.objectContaining({ jobId: reminderJobId('session-1', '15m') }),
    );
  });

  it('removes queued reminder jobs for a session', async () => {
    const removable = { remove: jest.fn() };
    reminderQueue.getJob.mockImplementation(async (jobId: string) => (
      jobId === reminderJobId('session-1', '24h') ? removable : null
    ));

    await service.cancelReminders('session-1');

    expect(reminderQueue.getJob).toHaveBeenCalledTimes(3);
    expect(removable.remove).toHaveBeenCalledTimes(1);
  });

  it('enqueues a pending expiry batch job', async () => {
    const sessions = [
      { id: 'session-1', commonId: 'common-1', createdAt: new Date('2026-08-30T12:00:00.000Z') },
      { id: 'session-2', commonId: 'common-1', createdAt: new Date('2026-08-30T12:00:00.000Z') },
    ] as any;

    await service.schedulePendingSessionExpiry(sessions);

    expect(paramService.getDefaultByName).toHaveBeenCalledWith(
      DefaultParameters.PENDING_SESSION_EXPIRY_IN_MINUTES,
    );
    expect(lifecycleQueue.add).toHaveBeenCalledWith(
      PENDING_SESSION_EXPIRY_JOB,
      { sessionIds: ['session-1', 'session-2'] },
      expect.objectContaining({
        jobId: pendingExpiryJobId(sessions),
        delay: 60 * 60_000,
      }),
    );
  });

  it('cancels the pending expiry batch job', async () => {
    const removable = { remove: jest.fn() };
    lifecycleQueue.getJob.mockResolvedValue(removable);
    const sessions = [{ id: 'session-1', commonId: 'common-1' }] as any;

    await service.cancelPendingSessionExpiry(sessions);

    expect(lifecycleQueue.getJob).toHaveBeenCalledWith(pendingExpiryJobId(sessions));
    expect(removable.remove).toHaveBeenCalledTimes(1);
  });
});
