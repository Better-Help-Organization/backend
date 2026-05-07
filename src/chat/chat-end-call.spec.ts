import { Test, TestingModule } from '@nestjs/testing';
import { SessionNotif, UserTypes } from '../common/constants';
import {
  makeChat,
  makeClient,
  makeTherapist,
  makeTokenPayload,
} from '../common/test-utils/mock-factories';
import { createChatServiceMocks } from '../common/test-utils/mock-providers';
import { ChatService } from './chat.service';

describe('ChatService - endCall', () => {
  let service: ChatService;
  let mocks: ReturnType<typeof createChatServiceMocks>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mocks = createChatServiceMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, ...mocks.providers],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  function mockFindOne(chat: any) {
    jest.spyOn(service, 'findOne' as any).mockResolvedValue(chat);
  }

  // ─── Group chat ─────────────────────────────────────

  describe('group chat', () => {
    it('client should only leave, not end the call', async () => {
      const therapist = makeTherapist({ id: 'th-1', firebaseToken: 'th-token' });
      const clientA = makeClient({ id: 'c-1', firebaseToken: 'c1-token' });
      const clientB = makeClient({ id: 'c-2', firebaseToken: 'c2-token' });

      const chat = makeChat({
        group: [clientA, clientB],
        therapist,
        activeCallRoom: 'group-room',
      });

      mockFindOne(chat);

      const result = await service.endCall(chat.id, makeTokenPayload('c-1', UserTypes.CLIENT));

      expect(result.status).toBe('left');
      expect(chat.activeCallRoom).toBe('group-room');
      expect(mocks.firebaseService.sendPushNotification).not.toHaveBeenCalled();
      expect(mocks.chatRepo.save).not.toHaveBeenCalled();
    });

    it('therapist should end the call for everyone', async () => {
      const therapist = makeTherapist({
        id: 'th-1',
        firebaseToken: 'th-token',
        firstName: 'DrSmith',
        avatar: 1,
      });
      const clientA = makeClient({ id: 'c-1', firebaseToken: 'c1-token' });
      const clientB = makeClient({ id: 'c-2', firebaseToken: 'c2-token' });

      const chat = makeChat({
        group: [clientA, clientB],
        therapist,
        activeCallRoom: 'group-room',
      });

      mockFindOne(chat);

      const result = await service.endCall(chat.id, makeTokenPayload('th-1', UserTypes.THERAPIST));

      expect(result.status).toBe('ended');
      expect(chat.activeCallRoom).toBeNull();
      expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          client: ['c1-token', 'c2-token'],
          therapist: [],
          admin: [],
        }),
        expect.any(String),
        SessionNotif.CALL_ENDED,
        expect.stringContaining('DrSmith'),
        expect.anything(),
      );
    });

    it('should not include clients without firebase tokens in notification', async () => {
      const therapist = makeTherapist({ id: 'th-1', firstName: 'Doc' });
      const clientNoToken = makeClient({ id: 'c-1', firebaseToken: null });

      const chat = makeChat({
        group: [clientNoToken],
        therapist,
        activeCallRoom: 'room-x',
      });

      mockFindOne(chat);

      await service.endCall(chat.id, makeTokenPayload('th-1', UserTypes.THERAPIST));

      expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({ client: [] }),
        expect.any(String),
        SessionNotif.CALL_ENDED,
        expect.any(String),
        expect.anything(),
      );
    });
  });

  // ─── Individual chat ────────────────────────────────

  describe('individual chat', () => {
    it('client ending should notify therapist', async () => {
      const therapist = makeTherapist({ id: 'th-1', firebaseToken: 'th-token' });
      const client = makeClient({ id: 'c-1', firstName: 'John', firebaseToken: 'c-token' });

      const chat = makeChat({
        client,
        therapist,
        group: [],
        activeCallRoom: 'room-1on1',
      });

      mockFindOne(chat);

      const result = await service.endCall(chat.id, makeTokenPayload('c-1', UserTypes.CLIENT));

      expect(result.status).toBe('ended');
      expect(chat.activeCallRoom).toBeNull();
      expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          client: [],
          therapist: ['th-token'],
        }),
        expect.any(String),
        SessionNotif.CALL_ENDED,
        expect.stringContaining('John'),
        expect.anything(),
      );
    });

    it('therapist ending should notify client', async () => {
      const therapist = makeTherapist({ id: 'th-1', firstName: 'DrSmith', firebaseToken: 'th-token' });
      const client = makeClient({ id: 'c-1', firebaseToken: 'c-token' });

      const chat = makeChat({
        client,
        therapist,
        group: [],
        activeCallRoom: 'room-1on1',
      });

      mockFindOne(chat);

      const result = await service.endCall(chat.id, makeTokenPayload('th-1', UserTypes.THERAPIST));

      expect(result.status).toBe('ended');
      expect(chat.activeCallRoom).toBeNull();
      expect(mocks.firebaseService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          client: ['c-token'],
          therapist: [],
        }),
        expect.any(String),
        SessionNotif.CALL_ENDED,
        expect.stringContaining('DrSmith'),
        expect.anything(),
      );
    });
  });
});
