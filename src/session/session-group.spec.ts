import { Test, TestingModule } from '@nestjs/testing';
import {
  DayOfWeek,
  SessionType,
  SubscriptionType,
} from '../common/constants';
import { ClientSubscription } from '../common/entities/client-subscription.entity';
import { Client } from '../common/entities/client.entity';
import { Session } from '../common/entities/session.entity';
import { Therapist } from '../common/entities/therapist.entity';
import {
  makeClient,
  makeClientSubscription,
  makeSubscription,
  makeTherapist,
} from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

describe('SessionService - createGroupSession', () => {
  let service: SessionService;
  let mocks: ReturnType<typeof createSessionServiceMocks>;

  // Track saved sessions
  const savedSessions: any[] = [];
  let persistedSubs: Record<string, ClientSubscription>;

  beforeEach(async () => {
    jest.clearAllMocks();
    savedSessions.length = 0;
    persistedSubs = {};

    mocks = createSessionServiceMocks();

    // Override manager.save to track sessions
    mocks.manager.save.mockImplementation(async (entityOrClass: any, data?: any) => {
      const entity = data ?? entityOrClass;
      const saved = { ...entity, id: entity.id ?? `entity-${Date.now()}-${Math.random()}` };
      if (entity.group && entity.schedule) {
        savedSessions.push(saved);
      }
      if (entity.client && entity.subscription) {
        persistedSubs[saved.id] = saved;
      }
      return saved;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, ...mocks.providers],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  function setupTestData() {
    const therapist = makeTherapist({ id: 'th-1' });
    const trialCatalog = makeSubscription(SubscriptionType.TRIAL);
    const monthlyCatalog = makeSubscription(SubscriptionType.MONTHLY);
    const quarterlyCatalog = makeSubscription(SubscriptionType.QUARTERLY);

    const clientTrial = makeClient({ id: 'client-trial', firstName: 'TrialUser' });
    const clientMonthly = makeClient({ id: 'client-monthly', firstName: 'MonthlyUser' });
    const clientQuarterly = makeClient({ id: 'client-quarterly', firstName: 'QuarterlyUser' });

    const csTrial = makeClientSubscription(clientTrial, trialCatalog, therapist);
    const csMonthly = makeClientSubscription(clientMonthly, monthlyCatalog, therapist);
    const csQuarterly = makeClientSubscription(clientQuarterly, quarterlyCatalog, therapist);

    persistedSubs[csTrial.id] = { ...csTrial, session: [], groupSessions: [] };
    persistedSubs[csMonthly.id] = { ...csMonthly, session: [], groupSessions: [] };
    persistedSubs[csQuarterly.id] = { ...csQuarterly, session: [], groupSessions: [] };

    clientTrial.activeSubscription = csTrial;
    clientMonthly.activeSubscription = csMonthly;
    clientQuarterly.activeSubscription = csQuarterly;

    mocks.manager.findOne.mockImplementation(async (Entity, opts) => {
      if (Entity === Therapist) return therapist;
      if (Entity === ClientSubscription) {
        const subId = opts?.where?.id;
        if (subId && persistedSubs[subId]) return persistedSubs[subId];

        const cid = opts?.where?.client?.id;
        if (cid === clientTrial.id) return persistedSubs[csTrial.id];
        if (cid === clientMonthly.id) return persistedSubs[csMonthly.id];
        if (cid === clientQuarterly.id) return persistedSubs[csQuarterly.id];
      }
      return null;
    });

    return { therapist, clientTrial, clientMonthly, clientQuarterly, csTrial, csMonthly, csQuarterly };
  }

  function makeDto(therapistId: string, clientIds: string[], overrides: any = {}) {
    return {
      groupClients: clientIds,
      therapist: therapistId,
      date: { date: DayOfWeek.MONDAY, startTime: '10:00' },
      duration: 60,
      type: SessionType.VIDEO,
      groupName: 'Test Group',
      note: null,
      ...overrides,
    };
  }

  function mockFindForClients(clients: Client[]) {
    mocks.manager.find.mockImplementation(async (Entity) => {
      if (Entity === Client) return clients;
      if (Entity === ClientSubscription) {
        return clients
          .map((client) => persistedSubs[client.activeSubscription?.id])
          .filter(Boolean);
      }
      return [];
    });
  }

  // ─── Tests ───────────────────────────────────────────

  it('trial client should appear in exactly 1 session, monthly in 4', async () => {
    const { therapist, clientTrial, clientMonthly } = setupTestData();
    mockFindForClients([clientTrial, clientMonthly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientMonthly.id]));

    expect(savedSessions.length).toBe(4);

    const trialCount = savedSessions.filter(s => s.group.some((c: Client) => c.id === clientTrial.id)).length;
    const monthlyCount = savedSessions.filter(s => s.group.some((c: Client) => c.id === clientMonthly.id)).length;

    expect(trialCount).toBe(1);
    expect(monthlyCount).toBe(4);
  });

  it('session 1 should have 2 members, sessions 2-4 should have 1', async () => {
    const { therapist, clientTrial, clientMonthly } = setupTestData();
    mockFindForClients([clientTrial, clientMonthly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientMonthly.id]));

    expect(savedSessions[0].group.length).toBe(2);
    expect(savedSessions[1].group.length).toBe(1);
    expect(savedSessions[2].group.length).toBe(1);
    expect(savedSessions[3].group.length).toBe(1);
  });

  it('trial + quarterly should create 12 sessions, trial in 1', async () => {
    const { therapist, clientTrial, clientQuarterly } = setupTestData();
    mockFindForClients([clientTrial, clientQuarterly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientQuarterly.id]));

    expect(savedSessions.length).toBe(12);

    const trialCount = savedSessions.filter(s => s.group.some((c: Client) => c.id === clientTrial.id)).length;
    const quarterlyCount = savedSessions.filter(s => s.group.some((c: Client) => c.id === clientQuarterly.id)).length;

    expect(trialCount).toBe(1);
    expect(quarterlyCount).toBe(12);
  });

  it('all sessions should have unique schedule dates (no overlaps)', async () => {
    const { therapist, clientTrial, clientMonthly } = setupTestData();
    mockFindForClients([clientTrial, clientMonthly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientMonthly.id]));

    const dates = savedSessions.map(s => s.schedule.toISOString());
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).toBe(savedSessions.length);
  });

  it('groupSubscription should only include subs for clients in that session', async () => {
    const { therapist, clientTrial, clientMonthly } = setupTestData();
    mockFindForClients([clientTrial, clientMonthly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientMonthly.id]));

    expect(savedSessions[0].groupSubscription.length).toBe(2);
    expect(savedSessions[1].groupSubscription.length).toBe(1);
    expect(savedSessions[2].groupSubscription.length).toBe(1);
    expect(savedSessions[3].groupSubscription.length).toBe(1);
  });

  it('two clients with same subscription type should both appear in all sessions', async () => {
    const { therapist } = setupTestData();
    const monthlyCatalog = makeSubscription(SubscriptionType.MONTHLY);

    const clientA = makeClient({ id: 'client-a', firstName: 'A' });
    const clientB = makeClient({ id: 'client-b', firstName: 'B' });
    clientA.activeSubscription = makeClientSubscription(clientA, monthlyCatalog, therapist);
    clientB.activeSubscription = makeClientSubscription(clientB, monthlyCatalog, therapist);

    persistedSubs[clientA.activeSubscription.id] = {
      ...clientA.activeSubscription,
      session: [],
      groupSessions: [],
    };
    persistedSubs[clientB.activeSubscription.id] = {
      ...clientB.activeSubscription,
      session: [],
      groupSessions: [],
    };
    mockFindForClients([clientA, clientB]);

    await service.createGroupSession(makeDto(therapist.id, [clientA.id, clientB.id]));

    expect(savedSessions.length).toBe(4);
    for (const session of savedSessions) {
      expect(session.group.length).toBe(2);
    }
  });

  it('stores segregated group sessions on each client subscription', async () => {
    const { therapist, clientTrial, clientMonthly, csTrial, csMonthly } = setupTestData();
    mockFindForClients([clientTrial, clientMonthly]);

    await service.createGroupSession(makeDto(therapist.id, [clientTrial.id, clientMonthly.id]));

    expect(persistedSubs[csTrial.id].groupSessions).toHaveLength(1);
    expect(persistedSubs[csMonthly.id].groupSessions).toHaveLength(4);
    expect(persistedSubs[csTrial.id].session).toHaveLength(0);
    expect(persistedSubs[csMonthly.id].session).toHaveLength(0);
  });
});
