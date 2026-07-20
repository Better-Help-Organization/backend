import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalStatus, DefaultParameters, SessionNotif, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { Session } from 'src/common/entities/session.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { ParameterService } from 'src/parameter/parameter.service';
import { NotificationScheduler } from './notification.scheduler';

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let firebaseService: { sendPushNotification: jest.Mock };
  let parameterService: { getDefaultByName: jest.Mock };
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let clientRepo: { update: jest.Mock; createQueryBuilder: jest.Mock };
  let sessionRepo: { find: jest.Mock; remove: jest.Mock };
  let therapistRepo: Record<string, never>;
  let clientSubscriptionRepo: { find: jest.Mock };
  let moodRepo: { findOne: jest.Mock };
  let noteRepo: Record<string, never>;
  let diaryRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:00:00.000Z'));

    firebaseService = { sendPushNotification: jest.fn() };
    parameterService = { getDefaultByName: jest.fn().mockResolvedValue(60) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    clientRepo = { update: jest.fn(), createQueryBuilder: jest.fn() };
    sessionRepo = { find: jest.fn(), remove: jest.fn() };
    therapistRepo = {};
    clientSubscriptionRepo = { find: jest.fn() };
    moodRepo = { findOne: jest.fn() };
    noteRepo = {};
    diaryRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationScheduler,
        { provide: FirebaseService, useValue: firebaseService },
        { provide: ParameterService, useValue: parameterService },
        { provide: LoggerService, useValue: logger },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: getRepositoryToken(Therapist), useValue: therapistRepo },
        { provide: getRepositoryToken(ClientSubscription), useValue: clientSubscriptionRepo },
        { provide: getRepositoryToken(Mood), useValue: moodRepo },
        { provide: getRepositoryToken(Note), useValue: noteRepo },
        { provide: getRepositoryToken(Diary), useValue: diaryRepo },
      ],
    }).compile();

    scheduler = module.get(NotificationScheduler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends expiry reminders for active subscriptions ending in 7 days', async () => {
    clientSubscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        end_date: new Date('2026-08-08T12:00:00.000Z'),
        client: { id: 'client-1', firebaseToken: 'client-token' },
      },
    ]);

    await scheduler.sendSubscriptionExpiryReminders();

    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'], therapist: [], admin: [] },
      'EXPIRY',
      SessionNotif.SUBSCRIPTION_EXPIRY,
      expect.stringContaining('Your subscription will expire on'),
    );
  });

  it('sends expiration-day notifications for active subscriptions ending today', async () => {
    clientSubscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        end_date: new Date('2026-08-01T18:00:00.000Z'),
        client: { id: 'client-1', firebaseToken: 'client-token' },
      },
    ]);

    await scheduler.sendSubscriptionExpiryDayNotification();

    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'], therapist: [], admin: [] },
      'SUBSCRIPTION EXPIRED',
      SessionNotif.SUBSCRIPTION_EXPIRED,
      'Your subscription has expired today. Renew now to continue your sessions.',
    );
  });

  it('sends inactivity reminders for subscriptions that expired 14 days ago', async () => {
    clientSubscriptionRepo.find.mockResolvedValue([
      {
        id: 'sub-1',
        status: SubscriptionStatus.INACTIVE,
        end_date: new Date('2026-07-18T12:00:00.000Z'),
        client: { id: 'client-1', firebaseToken: 'client-token' },
      },
    ]);

    await scheduler.sendInactivityReminders();

    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'], therapist: [], admin: [] },
      'REMINDER',
      SessionNotif.INACTIVITY,
      'It’s been a while since your last session. Come back and continue your journey.',
    );
  });

  it('removes stale pending sessions, clears client notifications, and alerts affected clients', async () => {
    sessionRepo.find.mockResolvedValue([
      {
        id: 'session-1',
        approvalStatus: ApprovalStatus.PENDING,
        createdAt: new Date('2026-08-01T09:00:00.000Z'),
        schedule: new Date('2026-08-02T10:00:00.000Z'),
        client: { id: 'client-1', firebaseToken: 'client-token' },
      },
    ]);
    sessionRepo.remove.mockResolvedValue(undefined);
    clientRepo.update.mockResolvedValue(undefined);

    await scheduler.PendingSessionCleanup();

    expect(parameterService.getDefaultByName).toHaveBeenCalledWith(
      DefaultParameters.PENDING_SESSION_EXPIRY_IN_MINUTES,
    );
    expect(sessionRepo.remove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'session-1' })]),
    );
    expect(clientRepo.update).toHaveBeenCalledWith('client-1', { hasNotification: null });
    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'], therapist: [], admin: [] },
      'Pending session removed',
      SessionNotif.PENDING_SESSION_DELETED,
      expect.stringContaining('was automatically removed'),
    );
  });
});
