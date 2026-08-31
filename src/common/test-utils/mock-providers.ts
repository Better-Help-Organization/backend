import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Availability } from '../entities/availability.entity';
import { Chat } from '../entities/chat.entity';
import { Client } from '../entities/client.entity';
import { ClientSubscription } from '../entities/client-subscription.entity';
import { Message } from '../entities/message.entity';
import { Session } from '../entities/session.entity';
import { LoggerService } from '../../logger/logger.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { ClientService } from '../../client/client.service';
import { ChatService } from '../../chat/chat.service';
import { TherapistService } from '../../therapist/therapist.service';
import { ParameterService } from '../../parameter/parameter.service';
import { LivekitService } from '../../livekit/livekit.service';
import { ReminderService } from '../../reminder/reminder.service';

export interface MockManager {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  query: jest.Mock;
  createQueryBuilder: jest.Mock;
  transaction: jest.Mock;
}

export interface MockSessionRepo {
  manager: MockManager;
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
}

export function createMockManager(): MockManager {
  let idCounter = 0;
  const mgr: MockManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((_Entity: any, data: any) => ({ ...data, id: data?.id ?? `entity-${++idCounter}` })),
    save: jest.fn(async (entityOrClass: any, data?: any) => {
      const entity = data ?? entityOrClass;
      return { ...entity, id: entity.id ?? `entity-${++idCounter}` };
    }),
    update: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      relation: jest.fn().mockReturnValue({
        of: jest.fn().mockReturnValue({
          add: jest.fn(),
        }),
      }),
    }),
    transaction: jest.fn(),
  };
  mgr.transaction.mockImplementation(async (cb: any) => cb(mgr));
  return mgr;
}

export function createMockSessionRepo(manager?: MockManager): MockSessionRepo {
  return {
    manager: manager ?? createMockManager(),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

export function createMockDataSource(manager: MockManager) {
  return {
    transaction: jest.fn(async (cb: any) => cb(manager)),
  };
}

export function createMockFirebaseService() {
  return {
    sendPushNotification: jest.fn(),
  };
}

export function createMockClientService() {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
  };
}

export function createMockTherapistService() {
  return {
    findOne: jest.fn(),
  };
}

export function createMockParamService() {
  return {
    getDefaultByName: jest.fn().mockResolvedValue(60),
    getAllParsedParams: jest.fn(),
  };
}

export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
}

/**
 * Returns all providers needed for SessionService with mocks.
 * Access individual mocks via the returned object.
 *
 * Usage:
 *   const mocks = createSessionServiceMocks();
 *   const module = await Test.createTestingModule({
 *     providers: [SessionService, ...mocks.providers],
 *   }).compile();
 */
export function createMockChatService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'mock-chat-id' }),
    findOne: jest.fn(),
  };
}

export function createMockReminderService() {
  return {
    scheduleReminders: jest.fn(),
    cancelReminders: jest.fn(),
    schedulePendingSessionExpiry: jest.fn(),
    cancelPendingSessionExpiry: jest.fn(),
  };
}

export function createSessionServiceMocks() {
  const manager = createMockManager();
  const sessionRepo = createMockSessionRepo(manager);
  const chatRepo = createMockRepo();
  const clientRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(async (entity: any) => entity) };
  const clientSubRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (entity: any) => entity),
  };
  const availabilityRepo = { delete: jest.fn() };
  const dataSource = createMockDataSource(manager);
  const firebaseService = createMockFirebaseService();
  const clientService = createMockClientService();
  const therapistService = createMockTherapistService();
  const paramService = createMockParamService();
  const chatService = createMockChatService();
  const reminderService = createMockReminderService();
  const logger = createMockLogger();

  const providers = [
    { provide: getRepositoryToken(Session), useValue: sessionRepo },
    { provide: getRepositoryToken(Chat), useValue: chatRepo },
    { provide: getRepositoryToken(Client), useValue: clientRepo },
    { provide: getRepositoryToken(ClientSubscription), useValue: clientSubRepo },
    { provide: getRepositoryToken(Availability), useValue: availabilityRepo },
    { provide: DataSource, useValue: dataSource },
    { provide: FirebaseService, useValue: firebaseService },
    { provide: ClientService, useValue: clientService },
    { provide: TherapistService, useValue: therapistService },
    { provide: ParameterService, useValue: paramService },
    { provide: ChatService, useValue: chatService },
    { provide: ReminderService, useValue: reminderService },
    { provide: LoggerService, useValue: logger },
  ];

  return {
    providers,
    manager,
    sessionRepo,
    chatRepo,
    clientRepo,
    clientSubRepo,
    availabilityRepo,
    dataSource,
    firebaseService,
    clientService,
    therapistService,
    paramService,
    chatService,
    reminderService,
    logger,
  };
}

export function createMockLivekitService() {
  return {
    createToken: jest.fn().mockResolvedValue('mock-token'),
  };
}

export function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(async (entity: any) => entity),
    create: jest.fn(),
  };
}

/**
 * Returns all providers needed for ChatService with mocks.
 *
 * Usage:
 *   const mocks = createChatServiceMocks();
 *   const module = await Test.createTestingModule({
 *     providers: [ChatService, ...mocks.providers],
 *   }).compile();
 */
export function createChatServiceMocks() {
  const chatRepo = createMockRepo();
  const msgRepo = createMockRepo();
  const firebaseService = createMockFirebaseService();
  const logger = createMockLogger();
  const clientService = createMockClientService();
  const therapistService = createMockTherapistService();
  const livekitService = createMockLivekitService();

  const providers = [
    { provide: getRepositoryToken(Chat), useValue: chatRepo },
    { provide: getRepositoryToken(Message), useValue: msgRepo },
    { provide: FirebaseService, useValue: firebaseService },
    { provide: LoggerService, useValue: logger },
    { provide: ClientService, useValue: clientService },
    { provide: TherapistService, useValue: therapistService },
    { provide: LivekitService, useValue: livekitService },
  ];

  return {
    providers,
    chatRepo,
    msgRepo,
    firebaseService,
    logger,
    clientService,
    therapistService,
    livekitService,
  };
}
