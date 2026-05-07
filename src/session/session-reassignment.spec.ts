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
    mocks.sessionRepo.find.mockResolvedValue([{ id: session.id, chat: groupChat } as Session]);
    mocks.sessionRepo.save.mockImplementation(async (entity: Session) => entity);

    const updated = await service.update(session.id, { therapist: newTherapist.id } as any);

    expect(mocks.chatRepo.update).toHaveBeenCalledWith(groupChat.id, {
      therapist: newTherapist,
      groupName: 'Anxiety Circle (with New)',
    });
    expect(updated.chat?.groupName).toBe('Anxiety Circle (with New)');
  });
});
