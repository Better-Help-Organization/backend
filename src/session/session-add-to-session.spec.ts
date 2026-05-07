import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionType } from '../common/constants';
import { Client } from '../common/entities/client.entity';
import {
  makeClient,
  makeClientSubscription,
  makeSession,
  makeSubscription,
  makeTherapist,
} from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

// ─── Helpers ──────────────────────────────────────────

function futureDate(weeksFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + weeksFromNow * 7);
  d.setHours(10, 0, 0, 0);
  return d;
}

// ─── Tests ────────────────────────────────────────────

describe('SessionService - addToSession', () => {
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

  function setupGroupSeries(sessionCount: number, existingGroupClients: Client[] = []) {
    const therapist = makeTherapist({ id: 'th-1' });
    const sessions = Array.from({ length: sessionCount }, (_, i) =>
      makeSession({
        id: `session-${i}`,
        commonId: 'common-1',
        schedule: futureDate(i + 1),
        group: [...existingGroupClients],
        groupSubscription: [],
        therapist,
      }),
    );

    // sessionRepo.findOne → reference session
    mocks.sessionRepo.findOne.mockResolvedValue(sessions[0]);

    // sessionRepo.find → related sessions
    mocks.sessionRepo.find.mockResolvedValue(sessions);

    // sessionRepo.manager.transaction → delegates to shared manager
    mocks.sessionRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));

    // manager defaults
    mocks.manager.query.mockResolvedValue([{ count: 0 }]);
    mocks.manager.findOne.mockResolvedValue(null);

    return { therapist, sessions };
  }

  function setupClient(subType: SubscriptionType, therapist: any, id?: string) {
    const catalog = makeSubscription(subType);
    const client = makeClient({ id: id ?? `client-${subType}`, firstName: `Client_${subType}` });
    const cs = makeClientSubscription(client, catalog, therapist);
    client.activeSubscription = cs;
    return client;
  }

  // ─── Precheck: quota exceeded ───────────────────────

  it('should skip trial client who already used their 1 session', async () => {
    const { therapist } = setupGroupSeries(4);
    const trialClient = setupClient(SubscriptionType.TRIAL, therapist);

    mocks.clientService.findAll.mockResolvedValue({ data: [trialClient] });
    mocks.manager.query.mockResolvedValue([{ count: 1 }]);

    await service.addToSession('session-0', { groupClients: [trialClient.id] });

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('1/1 sessions'),
    );
  });

  it('should skip monthly client who already used 4 sessions', async () => {
    const { therapist } = setupGroupSeries(8);
    const monthlyClient = setupClient(SubscriptionType.MONTHLY, therapist);

    mocks.clientService.findAll.mockResolvedValue({ data: [monthlyClient] });
    mocks.manager.query.mockResolvedValue([{ count: 4 }]);

    await service.addToSession('session-0', { groupClients: [monthlyClient.id] });

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('4/4 sessions'),
    );
  });

  // ─── Precheck: quota not exceeded ───────────────────

  it('should allow monthly client who has used 2 of 4 sessions', async () => {
    const { therapist, sessions } = setupGroupSeries(4);
    const monthlyClient = setupClient(SubscriptionType.MONTHLY, therapist);

    mocks.clientService.findAll.mockResolvedValue({ data: [monthlyClient] });
    mocks.manager.query.mockResolvedValue([{ count: 2 }]);

    await service.addToSession('session-0', { groupClients: [monthlyClient.id] });

    expect(mocks.logger.warn).not.toHaveBeenCalled();

    const sessionsWithClient = sessions.filter(s =>
      s.group.some((c: Client) => c.id === monthlyClient.id),
    );
    expect(sessionsWithClient.length).toBeGreaterThan(0);
  });

  it('should allow trial client with 0 used sessions', async () => {
    const { therapist, sessions } = setupGroupSeries(4);
    const trialClient = setupClient(SubscriptionType.TRIAL, therapist);

    mocks.clientService.findAll.mockResolvedValue({ data: [trialClient] });
    mocks.manager.query.mockResolvedValue([{ count: 0 }]);

    await service.addToSession('session-0', { groupClients: [trialClient.id] });

    expect(mocks.logger.warn).not.toHaveBeenCalled();

    const sessionsWithClient = sessions.filter(s =>
      s.group.some((c: Client) => c.id === trialClient.id),
    );
    expect(sessionsWithClient.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Mixed: one skipped, one added ──────────────────

  it('should add monthly client but skip exhausted trial client', async () => {
    const { therapist, sessions } = setupGroupSeries(4);
    const trialClient = setupClient(SubscriptionType.TRIAL, therapist, 'trial-1');
    const monthlyClient = setupClient(SubscriptionType.MONTHLY, therapist, 'monthly-1');

    mocks.clientService.findAll.mockResolvedValue({
      data: [trialClient, monthlyClient],
    });

    mocks.manager.query.mockImplementation(async (_sql: string, params: any[]) => {
      if (params[0] === trialClient.id) return [{ count: 1 }];
      if (params[0] === monthlyClient.id) return [{ count: 0 }];
      return [{ count: 0 }];
    });

    await service.addToSession('session-0', {
      groupClients: [trialClient.id, monthlyClient.id],
    });

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(trialClient.firstName),
    );

    const sessionsWithMonthly = sessions.filter(s =>
      s.group.some((c: Client) => c.id === monthlyClient.id),
    );
    expect(sessionsWithMonthly.length).toBeGreaterThan(0);

    const sessionsWithTrial = sessions.filter(s =>
      s.group.some((c: Client) => c.id === trialClient.id),
    );
    expect(sessionsWithTrial.length).toBe(0);
  });

  // ─── Chat dedup ─────────────────────────────────────

  it('should not add client to chat.group if already present', async () => {
    const { therapist, sessions } = setupGroupSeries(4);
    const monthlyClient = setupClient(SubscriptionType.MONTHLY, therapist, 'monthly-1');

    mocks.clientService.findAll.mockResolvedValue({ data: [monthlyClient] });
    mocks.manager.query.mockResolvedValue([{ count: 0 }]);

    // Chat already has this client in group
    const existingChat = {
      id: 'chat-1',
      group: [monthlyClient],
    };

    mocks.manager.findOne.mockImplementation(async (Entity: any, _opts?: any) => {
      if (Entity === (await import('../common/entities/chat.entity')).Chat) {
        return existingChat;
      }
      return null;
    });

    await service.addToSession('session-0', { groupClients: [monthlyClient.id] });

    // Chat group should still have exactly 1 entry, not 2
    expect(existingChat.group.length).toBe(1);
    expect(existingChat.group[0].id).toBe(monthlyClient.id);
  });

  it('should add new client to chat.group without duplicating existing members', async () => {
    const { therapist, sessions } = setupGroupSeries(4);
    const existingClient = makeClient({ id: 'existing-in-chat' });
    const newClient = setupClient(SubscriptionType.MONTHLY, therapist, 'new-client');

    mocks.clientService.findAll.mockResolvedValue({ data: [newClient] });
    mocks.manager.query.mockResolvedValue([{ count: 0 }]);

    const existingChat = {
      id: 'chat-1',
      group: [existingClient],
    };

    mocks.manager.findOne.mockImplementation(async (Entity: any, _opts?: any) => {
      if (Entity === (await import('../common/entities/chat.entity')).Chat) {
        return existingChat;
      }
      return null;
    });

    await service.addToSession('session-0', { groupClients: [newClient.id] });

    // Chat should have both: existing + new, no duplicates
    expect(existingChat.group.length).toBe(2);
    const ids = existingChat.group.map((c: any) => c.id);
    expect(ids).toContain(existingClient.id);
    expect(ids).toContain(newClient.id);
  });

  // ─── Validation ─────────────────────────────────────

  it('should throw if session not found', async () => {
    mocks.sessionRepo.findOne.mockResolvedValue(null);
    mocks.sessionRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));

    await expect(
      service.addToSession('nonexistent', { groupClients: ['c1'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw if session is 1-on-1', async () => {
    const session = makeSession({ client: makeClient() });
    mocks.sessionRepo.findOne.mockResolvedValue(session);
    mocks.sessionRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));

    await expect(
      service.addToSession(session.id, { groupClients: ['c1'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw if all clients already in the group', async () => {
    const existingClient = makeClient({ id: 'existing-1' });
    setupGroupSeries(4, [existingClient]);

    mocks.clientService.findAll.mockResolvedValue({ data: [existingClient] });

    await expect(
      service.addToSession('session-0', { groupClients: [existingClient.id] }),
    ).rejects.toThrow(BadRequestException);
  });
});
