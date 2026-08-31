import { Test, TestingModule } from '@nestjs/testing';
import { SessionStatus } from '../common/constants';
import { makeClient, makeSession, makeTherapist } from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

describe('SessionService - reminder queue lifecycle', () => {
  let service: SessionService;
  let mocks: ReturnType<typeof createSessionServiceMocks>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mocks = createSessionServiceMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, ...mocks.providers],
    }).compile();

    service = module.get(SessionService);
  });

  function stubSession(overrides = {}) {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const session = makeSession({
      id: 'session-1',
      commonId: 'common-1',
      client,
      therapist,
      group: [],
      groupSubscription: [],
      hasTherapistAttended: false,
      ...overrides,
    });

    mocks.sessionRepo.findOne.mockResolvedValue(session);
    mocks.sessionRepo.save.mockImplementation(async (entity: any) => entity);
    mocks.sessionRepo.manager.create.mockImplementation((_Entity: any, data: any) => data);
    mocks.sessionRepo.manager.save.mockResolvedValue(undefined);

    return session;
  }

  it('cancels then reschedules reminder jobs when a session is rescheduled', async () => {
    const session = stubSession();
    const nextSchedule = new Date('2026-09-02T14:00:00.000Z');

    await service.update(session.id, { schedule: nextSchedule } as any);

    expect(mocks.reminderService.cancelReminders).toHaveBeenCalledWith('session-1');
    expect(mocks.reminderService.scheduleReminders).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1', schedule: nextSchedule }),
    );
  });

  it('cancels pending reminder jobs when a session is cancelled', async () => {
    const session = stubSession();

    await service.update(session.id, {
      status: { status: SessionStatus.CANCELED, reason: 'client cancelled' },
    } as any);

    expect(mocks.reminderService.cancelReminders).toHaveBeenCalledWith('session-1');
    expect(mocks.reminderService.scheduleReminders).not.toHaveBeenCalled();
  });

  it('cancels reminder and pending-expiry jobs when a session is removed', async () => {
    const session = stubSession();
    mocks.sessionRepo.remove.mockResolvedValue(session);

    await service.remove(session.id);

    expect(mocks.reminderService.cancelReminders).toHaveBeenCalledWith('session-1');
    expect(mocks.reminderService.cancelPendingSessionExpiry).toHaveBeenCalledWith([session]);
    expect(mocks.sessionRepo.remove).toHaveBeenCalledWith(session);
  });
});
