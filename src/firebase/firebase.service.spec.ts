import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionNotif } from 'src/common/constants';
import { Client } from 'src/common/entities/client.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { LoggerService } from 'src/logger/logger.service';
import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;
  let firebaseAdmin: {
    messaging: jest.Mock;
  };
  let sendEachForMulticast: jest.Mock;
  let notifRepo: {
    update: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let clientRepo: {
    find: jest.Mock;
    update: jest.Mock;
  };
  let therapistRepo: {
    find: jest.Mock;
    update: jest.Mock;
  };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(async () => {
    sendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    firebaseAdmin = {
      messaging: jest.fn().mockReturnValue({
        sendEachForMulticast,
      }),
    };

    notifRepo = {
      update: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

    clientRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    therapistRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseService,
        { provide: LoggerService, useValue: logger },
        { provide: 'FIREBASE_ADMIN', useValue: firebaseAdmin },
        { provide: 'APN_PROVIDER', useValue: null },
        { provide: 'APN_PROVIDER_SECOND', useValue: null },
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Therapist), useValue: therapistRepo },
      ],
    }).compile();

    service = module.get(FirebaseService);
  });

  it('deduplicates tokens across all recipient buckets before sending', async () => {
    await service.sendPushNotification(
      {
        client: ['token-a', 'token-a'],
        therapist: ['token-a', 'token-b'],
        admin: ['token-b', 'token-c'],
      },
      JSON.stringify({ sessionId: 'session-1' }),
      SessionNotif.STATUS_CHANGED,
      'Status changed',
    );

    const payload = sendEachForMulticast.mock.calls[0][0];
    expect(payload.tokens).toEqual(['token-a', 'token-b', 'token-c']);
  });

  it('shrinks oversized notification data payloads to stay within the FCM limit', async () => {
    const hugeMessage = JSON.stringify({
      sessionId: 'session-1',
      commonId: 'common-1',
      therapistId: 'therapist-1',
      note: 'x'.repeat(12000),
    });

    await service.sendPushNotification(
      {
        client: ['token-a'],
        therapist: [],
        admin: [],
      },
      hugeMessage,
      SessionNotif.RE_SCHEDULED,
      'Session updated',
    );

    const payload = sendEachForMulticast.mock.calls[0][0];
    expect(Buffer.byteLength(JSON.stringify(payload.data), 'utf8')).toBeLessThanOrEqual(4096);
    expect(JSON.parse(payload.data.id)).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        commonId: 'common-1',
        therapistId: 'therapist-1',
      }),
    );
  });

  it('clears invalid registration tokens after firebase rejects them', async () => {
    sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: {
            code: 'messaging/registration-token-not-registered',
            message: 'NotRegistered',
          },
        },
      ],
    });

    await service.sendPushNotification(
      {
        client: ['stale-token'],
        therapist: [],
        admin: [],
      },
      JSON.stringify({ clientId: 'client-1' }),
      SessionNotif.STATUS_CHANGED,
      'Status changed',
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(clientRepo.update).toHaveBeenCalledWith(
      { firebaseToken: 'stale-token' },
      { firebaseToken: null },
    );
    expect(therapistRepo.update).toHaveBeenCalledWith(
      { firebaseToken: 'stale-token' },
      { firebaseToken: null },
    );
  });

  it('logs firebase send failures without throwing to callers', async () => {
    sendEachForMulticast.mockRejectedValue(new Error('firebase down'));

    await expect(
      service.sendPushNotification(
        {
          client: ['token-a'],
          therapist: [],
          admin: [],
        },
        JSON.stringify({ sessionId: 'session-1' }),
        SessionNotif.STATUS_CHANGED,
        'Status changed',
      ),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Error sending push notification:',
      expect.any(Error),
    );
  });
});
