import { Test, TestingModule } from '@nestjs/testing';
import { SessionNotif, SubscriptionStatus, SubscriptionType } from '../common/constants';
import { ClientSubscription } from '../common/entities/client-subscription.entity';
import { Session } from '../common/entities/session.entity';
import {
  makeClient,
  makeClientSubscription,
  makeSession,
  makeSubscription,
  makeTherapist,
} from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

describe('SessionService - subscription completion', () => {
  let service: SessionService;
  let mocks: ReturnType<typeof createSessionServiceMocks>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mocks = createSessionServiceMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, ...mocks.providers],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('deactivates an individual subscription and notifies the client when the last session is marked attended', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);
    client.activeSubscription = clientSubscription;

    const targetSession = makeSession({
      id: 'session-1',
      client,
      therapist,
      subscription: clientSubscription,
      hasTherapistAttended: false,
      group: [],
      groupSubscription: [],
    });
    const relatedSeriesSession = makeSession({
      id: 'session-2',
      client,
      therapist,
      subscription: clientSubscription,
      hasTherapistAttended: true,
      group: [],
      groupSubscription: [],
    });

    mocks.sessionRepo.findOne.mockResolvedValue(targetSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);
    mocks.sessionRepo.find.mockResolvedValue([
      { ...targetSession, hasTherapistAttended: true },
      relatedSeriesSession,
    ]);
    mocks.clientSubRepo.findOne.mockResolvedValue(clientSubscription);

    const updated = await service.update(targetSession.id, { hasTherapistAttended: true } as any);

    expect(updated.hasTherapistAttended).toBe(true);
    expect(mocks.clientSubRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: clientSubscription.id,
        status: SubscriptionStatus.INACTIVE,
      }),
    );
    expect(mocks.clientRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: client.id,
        activeSubscription: null,
        isInGroup: false,
      }),
    );
    expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'], therapist: [], admin: [] },
      JSON.stringify({ subscriptionId: clientSubscription.id }),
      SessionNotif.ALL_SESSIONS_COMPLETED,
      'Your program is complete. Please log out and await your next cycle.'
    );
  });

  it('does not deactivate the subscription early when other sessions are still unattended', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);
    client.activeSubscription = clientSubscription;

    const targetSession = makeSession({
      id: 'session-1',
      client,
      therapist,
      subscription: clientSubscription,
      hasTherapistAttended: false,
      group: [],
      groupSubscription: [],
    });
    const futureSession = makeSession({
      id: 'session-2',
      client,
      therapist,
      subscription: clientSubscription,
      hasTherapistAttended: false,
      group: [],
      groupSubscription: [],
    });

    mocks.sessionRepo.findOne.mockResolvedValue(targetSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);
    mocks.sessionRepo.find.mockResolvedValue([
      { ...targetSession, hasTherapistAttended: true },
      futureSession,
    ]);

    await service.update(targetSession.id, { hasTherapistAttended: true } as any);

    expect(mocks.clientSubRepo.findOne).not.toHaveBeenCalled();
    expect(mocks.clientSubRepo.save).not.toHaveBeenCalled();
    expect(mocks.clientRepo.save).not.toHaveBeenCalled();
    expect(mocks.firebaseService.sendPushNotification).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      SessionNotif.ALL_SESSIONS_COMPLETED,
      expect.anything(),
    );
  });

  it('deactivates each completed group subscription independently', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a' });
    const clientB = makeClient({ id: 'client-b', firebaseToken: 'token-b' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const subA = makeClientSubscription(clientA, catalog, therapist);
    const subB = makeClientSubscription(clientB, catalog, therapist);

    clientA.activeSubscription = subA;
    clientB.activeSubscription = subB;

    const groupSession = makeSession({
      id: 'group-session-1',
      client: null,
      therapist,
      subscription: null,
      group: [clientA, clientB],
      groupSubscription: [subA, subB],
      hasTherapistAttended: false,
    });

    mocks.sessionRepo.findOne.mockResolvedValue(groupSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);
    mocks.sessionRepo.find.mockImplementation(async ({ where }: { where: any[] }) => {
      const targetSubscriptionId = where?.[0]?.subscription?.id ?? where?.[1]?.groupSubscription?.id;
      return [
        makeSession({
          id: `completed-${targetSubscriptionId}`,
          client: null,
          therapist,
          subscription: null,
          group: targetSubscriptionId === subA.id ? [clientA] : [clientB],
          groupSubscription: [targetSubscriptionId === subA.id ? subA : subB],
          hasTherapistAttended: true,
        }),
      ];
    });
    mocks.clientSubRepo.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === subA.id) return subA as ClientSubscription;
      if (where.id === subB.id) return subB as ClientSubscription;
      return null;
    });

    await service.update(groupSession.id, { hasTherapistAttended: true } as any);

    expect(mocks.clientSubRepo.save).toHaveBeenCalledTimes(2);
    expect(mocks.clientSubRepo.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: subA.id, status: SubscriptionStatus.INACTIVE }),
    );
    expect(mocks.clientSubRepo.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: subB.id, status: SubscriptionStatus.INACTIVE }),
    );
    expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['token-a'], therapist: [], admin: [] },
      JSON.stringify({ subscriptionId: subA.id }),
      SessionNotif.ALL_SESSIONS_COMPLETED,
      'Your program is complete. Please log out and await your next cycle.'
    );
    expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['token-b'], therapist: [], admin: [] },
      JSON.stringify({ subscriptionId: subB.id }),
      SessionNotif.ALL_SESSIONS_COMPLETED,
      'Your program is complete. Please log out and await your next cycle.'
    );
  });

  it('does not resend completion notifications when the finished subscription is already inactive', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);
    clientSubscription.status = SubscriptionStatus.INACTIVE;
    client.activeSubscription = null;

    const targetSession = makeSession({
      id: 'session-1',
      client,
      therapist,
      subscription: clientSubscription,
      hasTherapistAttended: false,
      group: [],
      groupSubscription: [],
    });

    mocks.sessionRepo.findOne.mockResolvedValue(targetSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);
    mocks.sessionRepo.find.mockResolvedValue([
      { ...targetSession, hasTherapistAttended: true },
    ]);
    mocks.clientSubRepo.findOne.mockResolvedValue(clientSubscription);

    await service.update(targetSession.id, { hasTherapistAttended: true } as any);

    expect(mocks.clientSubRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: clientSubscription.id }),
    );
    expect(mocks.clientRepo.save).not.toHaveBeenCalled();
    expect(mocks.firebaseService.sendPushNotification).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      SessionNotif.ALL_SESSIONS_COMPLETED,
      expect.anything(),
    );
  });
});
