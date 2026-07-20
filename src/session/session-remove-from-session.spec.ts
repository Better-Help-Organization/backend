import { Test, TestingModule } from '@nestjs/testing';
import { SessionNotif } from '../common/constants';
import { Chat } from '../common/entities/chat.entity';
import { Client } from '../common/entities/client.entity';
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

describe('SessionService - removeFromSession', () => {
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

  function wireRelationRemove() {
    const relationRemove = jest.fn().mockResolvedValue(undefined);
    const relationOf = jest.fn().mockReturnValue({ remove: relationRemove });
    const relation = jest.fn().mockReturnValue({ of: relationOf });

    mocks.manager.createQueryBuilder.mockImplementation((entity?: any) => {
      if (!entity) {
        return { relation };
      }

      return {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };
    });

    return { relationRemove };
  }

  it('removes clients from future group sessions, shared chat members, and clears isInGroup when no future groups remain', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a', isInGroup: true });
    const clientB = makeClient({ id: 'client-b', firebaseToken: 'token-b', isInGroup: true });
    const catalog = makeSubscription(1 as any);
    const subA = makeClientSubscription(clientA, catalog, therapist);
    const subB = makeClientSubscription(clientB, catalog, therapist);
    const chat = {
      id: 'chat-1',
      group: [clientA, clientB],
    } as Chat;

    const referenceSession = makeSession({
      id: 'session-1',
      commonId: 'common-1',
      therapist,
      chat,
      group: [clientA, clientB],
      groupSubscription: [subA, subB],
    });
    const futureSession = makeSession({
      id: 'session-2',
      commonId: 'common-1',
      therapist,
      group: [clientA, clientB],
      groupSubscription: [subA, subB],
    });

    const getCount = jest.fn().mockResolvedValue(0);
    const { relationRemove } = wireRelationRemove();
    mocks.manager.createQueryBuilder.mockImplementation((entity?: any) => {
      if (!entity) {
        return {
          relation: jest.fn().mockReturnValue({
            of: jest.fn().mockReturnValue({ remove: relationRemove }),
          }),
        };
      }

      return {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount,
      };
    });

    mocks.sessionRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));
    mocks.manager.findOne.mockImplementation(async (Entity: any) => {
      if (Entity === Session) return referenceSession;
      return null;
    });
    mocks.manager.find.mockImplementation(async (Entity: any) => {
      if (Entity === Session) return [referenceSession, futureSession];
      if (Entity === Client) return [clientA];
      return [];
    });
    mocks.manager.save.mockImplementation(async (entity: any) => entity);
    mocks.manager.update.mockResolvedValue(undefined);

    const result = await service.removeFromSession(referenceSession.id, {
      groupClients: [clientA.id],
    });

    expect(result).toBe('Clients successfully removed from upcoming group sessions');
    expect(referenceSession.group.map((client) => client.id)).toEqual(['client-b']);
    expect(futureSession.group.map((client) => client.id)).toEqual(['client-b']);
    expect(referenceSession.groupSubscription.map((sub) => sub.id)).toEqual([subB.id]);
    expect(futureSession.groupSubscription.map((sub) => sub.id)).toEqual([subB.id]);
    expect(chat.group.map((client) => client.id)).toEqual(['client-b']);
    expect(relationRemove).toHaveBeenCalledWith([subA.id]);
    expect(mocks.manager.update).toHaveBeenCalledWith(Client, { id: clientA.id }, { isInGroup: false });
    expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['token-a'], therapist: [], admin: [] },
      expect.any(String),
      SessionNotif.GROUP_SESSION_REMOVED,
      expect.stringContaining('removed from upcoming group sessions'),
    );
    expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: [], therapist: ['therapist-token'], admin: [] },
      expect.any(String),
      SessionNotif.GROUP_SESSION_UPDATED,
      expect.stringContaining('1 client(s) removed'),
    );
  });

  it('keeps isInGroup true when the removed client still belongs to another future group session', async () => {
    const therapist = makeTherapist({ id: 'therapist-1', firebaseToken: 'therapist-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a', isInGroup: true });
    const catalog = makeSubscription(1 as any);
    const subA = makeClientSubscription(clientA, catalog, therapist);

    const referenceSession = makeSession({
      id: 'session-1',
      commonId: 'common-1',
      therapist,
      chat: { id: 'chat-1', group: [clientA] } as Chat,
      group: [clientA],
      groupSubscription: [subA],
    });

    const getCount = jest.fn().mockResolvedValue(1);
    const { relationRemove } = wireRelationRemove();
    mocks.manager.createQueryBuilder.mockImplementation((entity?: any) => {
      if (!entity) {
        return {
          relation: jest.fn().mockReturnValue({
            of: jest.fn().mockReturnValue({ remove: relationRemove }),
          }),
        };
      }

      return {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount,
      };
    });

    mocks.sessionRepo.manager.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));
    mocks.manager.findOne.mockImplementation(async (Entity: any) => {
      if (Entity === Session) return referenceSession;
      return null;
    });
    mocks.manager.find.mockImplementation(async (Entity: any) => {
      if (Entity === Session) return [referenceSession];
      if (Entity === Client) return [clientA];
      return [];
    });
    mocks.manager.save.mockImplementation(async (entity: any) => entity);
    mocks.manager.update.mockResolvedValue(undefined);

    await service.removeFromSession(referenceSession.id, {
      groupClients: [clientA.id],
    });

    expect(mocks.manager.update).not.toHaveBeenCalledWith(
      Client,
      { id: clientA.id },
      { isInGroup: false },
    );
  });
});
