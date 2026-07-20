import { Test, TestingModule } from '@nestjs/testing';
import { SessionNotif, SubscriptionStatus, SubscriptionType } from '../common/constants';
import {
  makeClient,
  makeClientSubscription,
  makeSession,
  makeSubscription,
  makeTherapist,
} from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

describe('SessionService - group attendance completion', () => {
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

  it('marks therapist attendance and deactivates a completed one-session group subscription', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token', isInGroup: true });
    const catalog = makeSubscription(SubscriptionType.TRIAL);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);
    client.activeSubscription = clientSubscription;

    const groupSession = makeSession({
      id: 'session-1',
      client: null,
      therapist,
      group: [client],
      groupAttendance: [],
      groupSubscription: [clientSubscription],
      hasTherapistAttended: false,
    });

    mocks.sessionRepo.findOne.mockResolvedValue(groupSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: any) => entity);
    mocks.sessionRepo.find.mockResolvedValue([
      { ...groupSession, hasTherapistAttended: true, groupAttendance: [client] },
    ]);
    mocks.clientSubRepo.findOne.mockResolvedValue(clientSubscription);

    const updated = await service.markAttendance(groupSession.id, client.id);

    expect(updated.groupAttendance.map((member) => member.id)).toContain(client.id);
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

  it('is idempotent when the same client marks group attendance twice', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);

    const groupSession = makeSession({
      id: 'session-1',
      client: null,
      therapist,
      group: [client],
      groupAttendance: [client],
      groupSubscription: [clientSubscription],
      hasTherapistAttended: false,
    });

    mocks.sessionRepo.findOne.mockResolvedValue(groupSession);
    mocks.sessionRepo.save.mockImplementation(async (entity: any) => entity);
    mocks.sessionRepo.find.mockResolvedValue([
      { ...groupSession, hasTherapistAttended: true },
      makeSession({
        id: 'session-2',
        client: null,
        therapist,
        group: [client],
        groupAttendance: [],
        groupSubscription: [clientSubscription],
        hasTherapistAttended: false,
      }),
    ]);

    const updated = await service.markAttendance(groupSession.id, client.id);

    expect(updated.groupAttendance.filter((member) => member.id === client.id)).toHaveLength(1);
    expect(updated.hasTherapistAttended).toBe(true);
    expect(mocks.clientSubRepo.save).not.toHaveBeenCalled();
  });
});
