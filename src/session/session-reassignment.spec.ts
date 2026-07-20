import { Test, TestingModule } from '@nestjs/testing';
import { Chat } from '../common/entities/chat.entity';
import { Session } from '../common/entities/session.entity';
import { makeChat, makeClient, makeTherapist } from '../common/test-utils/mock-factories';
import { createSessionServiceMocks } from '../common/test-utils/mock-providers';
import { SessionService } from './session.service';

describe('SessionService - therapist reassignment chat handling', () => {
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

  function wireCommonIdTransaction(
    seriesSessions: Session[],
    managerChatRepo: Partial<{
      findOne: jest.Mock;
      update: jest.Mock;
      save: jest.Mock;
      create: jest.Mock;
      find: jest.Mock;
    }>,
  ) {
    const lockQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(seriesSessions),
    };

    const seriesQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(seriesSessions),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    const sessionManagerRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(lockQueryBuilder)
        .mockReturnValueOnce(seriesQueryBuilder)
        .mockReturnValue(seriesQueryBuilder),
      save: jest.fn(async (entities: Session[]) => entities),
    };

    const chatRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      ...managerChatRepo,
    };

    (mocks.manager as any).getRepository = jest.fn((entity: any) => {
      if (entity === Session) return sessionManagerRepo;
      if (entity === Chat) return chatRepo;
      return sessionManagerRepo;
    });

    mocks.dataSource.transaction.mockImplementation(async (cb: any) => cb(mocks.manager));

    return { sessionManagerRepo, chatRepo };
  }

  it('reuses an existing direct chat when reassigning a single session', async () => {
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const oldChat = makeChat({ id: 'chat-old', client, therapist: oldTherapist });
    const existingNewChat = makeChat({ id: 'chat-new', client, therapist: newTherapist });
    const session = {
      id: 'session-1',
      client,
      therapist: oldTherapist,
      chat: oldChat,
      group: [],
      hasTherapistAttended: false,
    } as unknown as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(session);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.findOne.mockResolvedValue(existingNewChat);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const updated = await service.update(session.id, { therapist: newTherapist.id } as any);

    expect(updated.chat).toBe(existingNewChat);
    expect(updated.therapist).toBe(newTherapist);
    expect(mocks.chatRepo.update).not.toHaveBeenCalled();
    expect(mocks.chatRepo.save).not.toHaveBeenCalled();
  });

  it('clones a shared chat instead of reassigning it in place for a single session', async () => {
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const oldChat = makeChat({ id: 'chat-old', client, therapist: oldTherapist, closed: false });
    const clonedChat = makeChat({ id: 'chat-clone', client, therapist: newTherapist, closed: false });
    const session = {
      id: 'session-1',
      client,
      therapist: oldTherapist,
      chat: oldChat,
      group: [],
      hasTherapistAttended: false,
    } as unknown as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(session);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.findOne.mockResolvedValue(null);
    mocks.sessionRepo.find.mockResolvedValue([
      { id: session.id, chat: oldChat } as Session,
      { id: 'session-2', chat: oldChat } as Session,
    ]);
    mocks.chatRepo.create.mockImplementation((data: Partial<Chat>) => data);
    mocks.chatRepo.save.mockResolvedValue(clonedChat);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const updated = await service.update(session.id, { therapist: newTherapist.id } as any);

    expect(updated.chat).toBe(clonedChat);
    expect(mocks.chatRepo.update).not.toHaveBeenCalled();
    expect(mocks.chatRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client,
        therapist: newTherapist,
        closed: false,
      }),
    );
  });

  it('reuses an existing direct chat when batch reassigning sessions', async () => {
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firebaseToken: 'new-token' });
    const oldChat = makeChat({ id: 'chat-old', client, therapist: oldTherapist });
    const existingNewChat = makeChat({ id: 'chat-new', client, therapist: newTherapist });
    const session = {
      id: 'session-1',
      commonId: 'common-1',
      client,
      therapist: oldTherapist,
      chat: oldChat,
    } as unknown as Session;

    mocks.sessionRepo.find.mockResolvedValue([session]);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.findOne.mockResolvedValue(existingNewChat);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session | Session[]) => entity);

    const result = await service.batchUpdate({
      commonId: 'common-1',
      updates: { therapist: newTherapist.id },
    } as any);

    expect(result).toEqual({
      updatedCount: 1,
      message: 'Batch update successful',
    });
    expect(session.chat).toBe(existingNewChat);
    expect(session.therapist).toBe(newTherapist);
    expect(mocks.chatRepo.update).not.toHaveBeenCalled();
    expect(mocks.chatRepo.save).not.toHaveBeenCalled();
  });

  it('renames reassigned group chats with the new therapist first name', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const groupChat = makeChat({ id: 'chat-group', client: null, therapist: oldTherapist, groupName: 'Anxiety Circle' });
    const session = {
      id: 'session-1',
      client: null,
      therapist: oldTherapist,
      chat: groupChat,
      group: [makeClient({ id: 'client-1' })],
      hasTherapistAttended: false,
    } as unknown as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(session);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.findOne.mockResolvedValue(groupChat);
    mocks.sessionRepo.find.mockResolvedValue([{ id: session.id, chat: groupChat } as Session]);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const updated = await service.update(session.id, { therapist: newTherapist.id } as any);

    expect(mocks.chatRepo.update).toHaveBeenCalledWith(groupChat.id, {
      therapist: newTherapist,
      groupName: 'Anxiety Circle (with New)',
    });
    expect(updated.chat?.groupName).toBe('Anxiety Circle (with New)');
  });

  it('reuses an existing future-series chat for the new therapist in commonId reassignment', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a' });
    const currentChat = makeChat({ id: 'chat-old', client: null, therapist: oldTherapist, groupName: 'Nike' });
    const canonicalChat = makeChat({
      id: 'chat-canonical',
      client: null,
      therapist: newTherapist,
      group: [clientA],
      groupName: 'Nike',
    });

    const selectedSession = {
      id: 'session-1',
      commonId: 'common-1',
      client: null,
      therapist: oldTherapist,
      chat: currentChat,
      group: [clientA],
      groupSubscription: [],
      hasTherapistAttended: false,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    } as unknown as Session;
    const futureOldTherapistSession = {
      ...selectedSession,
      id: 'session-2',
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    } as Session;
    const futureNewTherapistSession = {
      ...selectedSession,
      id: 'session-3',
      therapist: newTherapist,
      chat: canonicalChat,
      schedule: new Date('2026-08-15T10:00:00.000Z'),
    } as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(selectedSession);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const { sessionManagerRepo, chatRepo } = wireCommonIdTransaction(
      [selectedSession, futureOldTherapistSession, futureNewTherapistSession],
      {
        findOne: jest.fn().mockResolvedValue(canonicalChat),
      },
    );

    const updated = await service.update(selectedSession.id, { therapist: newTherapist.id } as any);

    expect(updated.chat).toBe(canonicalChat);
    expect(sessionManagerRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'session-1', chat: canonicalChat, therapist: newTherapist }),
        expect.objectContaining({ id: 'session-2', chat: canonicalChat, therapist: newTherapist }),
      ]),
    );
    expect(chatRepo.update).not.toHaveBeenCalled();
    expect(chatRepo.save).not.toHaveBeenCalled();
  });

  it('reuses the current series group chat in place instead of creating a new chat during commonId reassignment', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a' });
    const currentChat = makeChat({
      id: 'chat-old',
      client: null,
      therapist: oldTherapist,
      group: [clientA],
      groupName: 'Nike (with Old)',
    });

    const selectedSession = {
      id: 'session-1',
      commonId: 'common-1',
      client: null,
      therapist: oldTherapist,
      chat: currentChat,
      group: [clientA],
      groupSubscription: [],
      hasTherapistAttended: false,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    } as unknown as Session;
    const futureSession = {
      ...selectedSession,
      id: 'session-2',
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    } as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(selectedSession);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const { chatRepo } = wireCommonIdTransaction(
      [selectedSession, futureSession],
      {
        findOne: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id === currentChat.id) return currentChat;
          return null;
        }),
      },
    );

    const updated = await service.update(selectedSession.id, { therapist: newTherapist.id } as any);

    expect(chatRepo.update).toHaveBeenCalledWith(currentChat.id, {
      therapist: newTherapist,
      groupName: 'Nike',
    });
    expect(chatRepo.save).not.toHaveBeenCalled();
    expect(updated.chat).toEqual(
      expect.objectContaining({
        id: currentChat.id,
        therapist: newTherapist,
        groupName: 'Nike',
      }),
    );
  });

  it('skips attended future sessions during commonId reassignment', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const clientA = makeClient({ id: 'client-a', firebaseToken: 'token-a' });
    const currentChat = makeChat({
      id: 'chat-old',
      client: null,
      therapist: oldTherapist,
      group: [clientA],
      groupName: 'Nike (with Old)',
    });

    const selectedSession = {
      id: 'session-1',
      commonId: 'common-1',
      client: null,
      therapist: oldTherapist,
      chat: currentChat,
      group: [clientA],
      groupSubscription: [],
      hasTherapistAttended: false,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    } as unknown as Session;
    const attendedFutureSession = {
      ...selectedSession,
      id: 'session-2',
      hasTherapistAttended: true,
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    } as Session;
    const pendingFutureSession = {
      ...selectedSession,
      id: 'session-3',
      schedule: new Date('2026-08-15T10:00:00.000Z'),
    } as Session;

    mocks.sessionRepo.findOne.mockResolvedValue(selectedSession);
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const { sessionManagerRepo } = wireCommonIdTransaction(
      [selectedSession, attendedFutureSession, pendingFutureSession],
      {
        findOne: jest.fn().mockResolvedValue(currentChat),
      },
    );

    await service.update(selectedSession.id, { therapist: newTherapist.id } as any);

    expect(sessionManagerRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'session-1', therapist: newTherapist }),
        expect.objectContaining({ id: 'session-3', therapist: newTherapist }),
      ]),
    );
    expect(sessionManagerRepo.save).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'session-2', therapist: newTherapist })]),
    );
  });

  it('batch reassignment can clone a shared group chat while leaving excluded sessions on the original chat', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const groupClient = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldChat = makeChat({
      id: 'chat-old',
      client: null,
      therapist: oldTherapist,
      group: [groupClient],
      groupName: 'Support Circle',
      closed: false,
    });
    const clonedChat = makeChat({
      id: 'chat-clone',
      client: null,
      therapist: newTherapist,
      group: [groupClient],
      groupName: 'Support Circle (with New)',
      closed: false,
    });

    const updatedSession = {
      id: 'session-1',
      commonId: 'common-1',
      client: null,
      group: [groupClient],
      therapist: oldTherapist,
      chat: oldChat,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    } as unknown as Session;
    const excludedSession = {
      id: 'session-2',
      commonId: 'common-1',
      client: null,
      group: [groupClient],
      therapist: oldTherapist,
      chat: oldChat,
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    } as unknown as Session;

    mocks.sessionRepo.find.mockImplementation(async (args?: any) => {
      if (args?.where?.chat?.id === oldChat.id) {
        return [updatedSession, excludedSession];
      }

      return [updatedSession];
    });
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.find.mockResolvedValue([]);
    mocks.chatRepo.findOne.mockResolvedValue(oldChat);
    mocks.chatRepo.create.mockImplementation((data: Partial<Chat>) => data);
    mocks.chatRepo.save.mockResolvedValue(clonedChat);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session | Session[]) => entity);

    const result = await service.batchUpdate({
      commonId: 'common-1',
      excludedSessionIds: ['session-2'],
      updates: { therapist: newTherapist.id },
    } as any);

    expect(result).toEqual({
      updatedCount: 1,
      message: 'Batch update successful',
    });
    expect(updatedSession.chat).toBe(clonedChat);
    expect(excludedSession.chat).toBe(oldChat);
    expect(mocks.chatRepo.update).not.toHaveBeenCalled();
    expect(mocks.chatRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        therapist: newTherapist,
        groupName: 'Support Circle (with New)',
      }),
    );
  });

  it('reuses an existing cloned group chat on repeated batch reassignment instead of cloning again', async () => {
    const oldTherapist = makeTherapist({ id: 'therapist-old', firebaseToken: 'old-token' });
    const newTherapist = makeTherapist({ id: 'therapist-new', firstName: 'New', firebaseToken: 'new-token' });
    const groupClient = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldChat = makeChat({
      id: 'chat-old',
      client: null,
      therapist: oldTherapist,
      group: [groupClient],
      groupName: 'Support Circle',
      closed: false,
    });
    const canonicalClonedChat = makeChat({
      id: 'chat-clone-existing',
      client: null,
      therapist: newTherapist,
      group: [groupClient],
      groupName: 'Support Circle (with New)',
      closed: false,
    });

    const session = {
      id: 'session-2',
      commonId: 'common-1',
      client: null,
      group: [groupClient],
      therapist: oldTherapist,
      chat: oldChat,
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    } as unknown as Session;

    mocks.sessionRepo.find.mockImplementation(async (args?: any) => {
      if (args?.where?.chat?.id === oldChat.id) {
        return [session, { id: 'session-1', chat: oldChat } as Session];
      }

      return [session];
    });
    mocks.therapistService.findOne.mockResolvedValue(newTherapist);
    mocks.chatRepo.findOne.mockResolvedValue(oldChat);
    mocks.chatRepo.find.mockResolvedValue([canonicalClonedChat]);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session | Session[]) => entity);

    const result = await service.batchUpdate({
      commonId: 'common-1',
      updates: { therapist: newTherapist.id },
    } as any);

    expect(result).toEqual({
      updatedCount: 1,
      message: 'Batch update successful',
    });
    expect(session.chat).toBe(canonicalClonedChat);
    expect(mocks.chatRepo.create).not.toHaveBeenCalled();
    expect(mocks.chatRepo.save).not.toHaveBeenCalled();
    expect(mocks.chatRepo.update).not.toHaveBeenCalled();
  });
});
