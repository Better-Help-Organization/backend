import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Availability } from '../entities/availability.entity';
import { Client } from '../entities/client.entity';
import { ClientSubscription } from '../entities/client-subscription.entity';
import { Session } from '../entities/session.entity';
import { LoggerService } from '../../logger/logger.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { ClientService } from '../../client/client.service';
import { TherapistService } from '../../therapist/therapist.service';
import { ParameterService } from '../../parameter/parameter.service';

export interface MockManager {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

export interface MockSessionRepo {
  manager: MockManager;
  findOne: jest.Mock;
  find: jest.Mock;
}

export function createMockManager(): MockManager {
  let idCounter = 0;
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((_Entity, data) => ({ ...data, id: data?.id ?? `entity-${++idCounter}` })),
    save: jest.fn(async (entityOrClass: any, data?: any) => {
      const entity = data ?? entityOrClass;
      return { ...entity, id: entity.id ?? `entity-${++idCounter}` };
    }),
    update: jest.fn(),
  };
}

export function createMockSessionRepo(manager?: MockManager): MockSessionRepo {
  return {
    manager: manager ?? createMockManager(),
    findOne: jest.fn(),
    find: jest.fn(),
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
export function createSessionServiceMocks() {
  const manager = createMockManager();
  const sessionRepo = createMockSessionRepo(manager);
  const clientRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const clientSubRepo = { findOne: jest.fn(), find: jest.fn() };
  const availabilityRepo = {};
  const dataSource = createMockDataSource(manager);
  const firebaseService = createMockFirebaseService();
  const clientService = createMockClientService();
  const therapistService = createMockTherapistService();
  const paramService = createMockParamService();
  const logger = createMockLogger();

  const providers = [
    { provide: getRepositoryToken(Session), useValue: sessionRepo },
    { provide: getRepositoryToken(Client), useValue: clientRepo },
    { provide: getRepositoryToken(ClientSubscription), useValue: clientSubRepo },
    { provide: getRepositoryToken(Availability), useValue: availabilityRepo },
    { provide: DataSource, useValue: dataSource },
    { provide: FirebaseService, useValue: firebaseService },
    { provide: ClientService, useValue: clientService },
    { provide: TherapistService, useValue: therapistService },
    { provide: ParameterService, useValue: paramService },
    { provide: LoggerService, useValue: logger },
  ];

  return {
    providers,
    manager,
    sessionRepo,
    clientRepo,
    clientSubRepo,
    dataSource,
    firebaseService,
    clientService,
    therapistService,
    paramService,
    logger,
  };
}
