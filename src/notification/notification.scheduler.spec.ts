import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionNotif, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { NotificationScheduler } from './notification.scheduler';

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let firebaseService: { sendPushNotification: jest.Mock };
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let clientRepo: { update: jest.Mock; createQueryBuilder: jest.Mock };
  let clientSubscriptionRepo: { find: jest.Mock };
  let moodRepo: { findOne: jest.Mock };
  let noteRepo: Record<string, never>;
  let diaryRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:00:00.000Z'));

    firebaseService = { sendPushNotification: jest.fn() };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    clientRepo = { update: jest.fn(), createQueryBuilder: jest.fn() };
    clientSubscriptionRepo = { find: jest.fn() };
    moodRepo = { findOne: jest.fn() };
    noteRepo = {};
    diaryRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationScheduler,
        { provide: FirebaseService, useValue: firebaseService },
        { provide: LoggerService, useValue: logger },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
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
});
