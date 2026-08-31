import { Job } from 'bullmq';
import { ApprovalStatus, SessionNotif, SessionStatus } from 'src/common/constants';
import { SESSION_REMINDER_JOB } from './reminder.constants';
import { ReminderProcessor } from './reminder.processor';

describe('ReminderProcessor', () => {
  let processor: ReminderProcessor;
  let sessionRepo: { findOne: jest.Mock };
  let firebaseService: { sendPushNotification: jest.Mock };

  const job = { name: SESSION_REMINDER_JOB, data: { sessionId: 'session-1' } } as Job;

  beforeEach(() => {
    sessionRepo = { findOne: jest.fn() };
    firebaseService = { sendPushNotification: jest.fn() };
    processor = new ReminderProcessor(sessionRepo as any, firebaseService as any);
  });

  it('skips sending when the session no longer exists', async () => {
    sessionRepo.findOne.mockResolvedValue(null);

    await processor.process(job);

    expect(firebaseService.sendPushNotification).not.toHaveBeenCalled();
  });

  it('skips sending when the session is cancelled', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 'session-1',
      schedule: new Date('2026-08-31T10:00:00.000Z'),
      approvalStatus: ApprovalStatus.CONFIRMED,
      latestStatus: SessionStatus.CANCELED,
      client: { firstName: 'Ada', firebaseToken: 'client-token' },
      therapist: { firstName: 'Bo', firebaseToken: 'therapist-token' },
      group: [],
    });

    await processor.process(job);

    expect(firebaseService.sendPushNotification).not.toHaveBeenCalled();
  });

  it('sends client and therapist reminders for a live confirmed session', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 'session-1',
      schedule: new Date('2026-08-31T10:00:00.000Z'),
      approvalStatus: ApprovalStatus.CONFIRMED,
      latestStatus: SessionStatus.SCHEDULED,
      client: { firstName: 'Ada', firebaseToken: 'client-token' },
      therapist: { firstName: 'Bo', firebaseToken: 'therapist-token' },
      group: [{ firstName: 'Gus', firebaseToken: 'group-token' }],
    });

    await processor.process(job);

    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token', 'group-token'], therapist: [], admin: [] },
      'SESSION',
      SessionNotif.SESSION_REMINDER_CLIENT,
      expect.stringContaining('Bo'),
    );
    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: [], therapist: ['therapist-token'], admin: [] },
      'SESSION',
      SessionNotif.SESSION_REMINDER_THERAPIST,
      expect.stringContaining('Ada'),
    );
  });
});
