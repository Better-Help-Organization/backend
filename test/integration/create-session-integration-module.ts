import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChatService } from 'src/chat/chat.service';
import { ClientService } from 'src/client/client.service';
import {
  AdminRoles,
  ApprovalStatus,
  BaseStatus,
  Gender,
  SessionType,
  SubscriptionStatus,
  SubscriptionType,
  UserTypes,
} from 'src/common/constants';
import { DynamicGuard } from 'src/common/guard/dynamic.guard';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { Availability } from 'src/common/entities/availability.entity';
import { Chat } from 'src/common/entities/chat.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { ParameterService } from 'src/parameter/parameter.service';
import { SessionController } from 'src/session/session.controller';
import { ReminderService } from 'src/reminder/reminder.service';
import { SessionService } from 'src/session/session.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { ALL_TEST_ENTITIES } from './all-test-entities';
import { IntegrationNamingStrategy } from './integration-naming.strategy';

function createSessionTestDoubles() {
  const firebaseService = { sendPushNotification: jest.fn() };
  const clientService = { findOne: jest.fn(), findAll: jest.fn() };
  const therapistService = { findOne: jest.fn() };
  const parameterService = { getDefaultByName: jest.fn().mockResolvedValue(60), getAllParsedParams: jest.fn() };
  const chatService = { create: jest.fn(), findOne: jest.fn() };
  const reminderService = { scheduleReminders: jest.fn(), cancelReminders: jest.fn() };
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  return {
    firebaseService,
    clientService,
    therapistService,
    parameterService,
    chatService,
    reminderService,
    logger,
  };
}

function createRepositories(dataSource: DataSource) {
  return {
    session: dataSource.getRepository(Session),
    chat: dataSource.getRepository(Chat),
    client: dataSource.getRepository(Client),
    clientSubscription: dataSource.getRepository(ClientSubscription),
    therapist: dataSource.getRepository(Therapist),
    subscription: dataSource.getRepository(Subscription),
    modal: dataSource.getRepository(Modal),
    level: dataSource.getRepository(Level),
    availability: dataSource.getRepository(Availability),
  };
}

async function buildSessionTestingModule(includeController = false) {
  const doubles = createSessionTestDoubles();

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'mysql',
        host: process.env.TEST_MYSQL_HOST,
        port: Number(process.env.TEST_MYSQL_PORT),
        username: process.env.TEST_MYSQL_USER,
        password: process.env.TEST_MYSQL_PASSWORD,
        database: process.env.TEST_MYSQL_DATABASE,
        entities: ALL_TEST_ENTITIES as unknown as Function[],
        synchronize: true,
        dropSchema: true,
        namingStrategy: new IntegrationNamingStrategy(),
      }),
      TypeOrmModule.forFeature([Session, Chat, Client, ClientSubscription, Availability]),
    ],
    controllers: includeController ? [SessionController] : [],
    providers: [
      SessionService,
      { provide: FirebaseService, useValue: doubles.firebaseService },
      { provide: ClientService, useValue: doubles.clientService },
      { provide: TherapistService, useValue: doubles.therapistService },
      { provide: ParameterService, useValue: doubles.parameterService },
      { provide: ChatService, useValue: doubles.chatService },
      { provide: ReminderService, useValue: doubles.reminderService },
      { provide: LoggerService, useValue: doubles.logger },
    ],
  }).compile();

  return { moduleRef, ...doubles };
}

export async function createSessionIntegrationModule() {
  const { moduleRef, ...doubles } = await buildSessionTestingModule(false);
  const dataSource = moduleRef.get(DataSource);

  return {
    moduleRef,
    dataSource,
    service: moduleRef.get(SessionService),
    ...doubles,
    repositories: createRepositories(dataSource),
  };
}

export async function createSessionIntegrationApp(): Promise<{
  app: INestApplication;
  moduleRef: TestingModule;
  dataSource: DataSource;
  service: SessionService;
  guardSpies: jest.SpyInstance[];
  firebaseService: { sendPushNotification: jest.Mock };
  clientService: { findOne: jest.Mock; findAll: jest.Mock };
  therapistService: { findOne: jest.Mock };
  parameterService: { getDefaultByName: jest.Mock; getAllParsedParams: jest.Mock };
  chatService: { create: jest.Mock; findOne: jest.Mock };
  reminderService: { scheduleReminders: jest.Mock; cancelReminders: jest.Mock };
  logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  repositories: ReturnType<typeof createRepositories>;
}> {
  const { moduleRef, ...doubles } = await buildSessionTestingModule(true);
  const dataSource = moduleRef.get(DataSource);
  const app = moduleRef.createNestApplication();
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new DynamicGuard(reflector));

  const adminUser = {
    id: 'test-admin',
    type: UserTypes.ADMIN,
    role: AdminRoles.SUPER,
    status: BaseStatus.ACTIVE,
  };

  const guardSpies = [AdminJwtAuthGuard, TherapistJwtAuthGuard, ClientJwtAuthGuard].map((GuardClass) =>
    jest.spyOn(GuardClass.prototype, 'canActivate').mockImplementation(async (context: any) => {
      context.switchToHttp().getRequest().user = adminUser;
      return true;
    }),
  );

  await app.init();

  return {
    app,
    moduleRef,
    dataSource,
    service: moduleRef.get(SessionService),
    guardSpies,
    ...doubles,
    repositories: createRepositories(dataSource),
  };
}

export async function seedCatalog(
  repositories: {
    level: Repository<Level>;
    modal: Repository<Modal>;
    subscription: Repository<Subscription>;
  },
  type = SubscriptionType.MONTHLY,
) {
  const level = await repositories.level.save(
    repositories.level.create({
      type: 'associate',
      minXP: 0,
      maxXP: 5,
      price: 1000,
    }),
  );

  const modal = await repositories.modal.save(
    repositories.modal.create({
      name: 'Individual Therapy',
      order: 1,
      description: 'Integration test modal',
    }),
  );

  const subscription = await repositories.subscription.save(
    repositories.subscription.create({
      type,
      price: 2400,
      old_price: null,
      is_admin_created: true,
      modal,
      level,
    }),
  );

  return { level, modal, subscription };
}

export async function createTherapist(
  repositories: {
    therapist: Repository<Therapist>;
  },
  overrides: Partial<Therapist> = {},
) {
  return repositories.therapist.save(
    repositories.therapist.create({
      firstName: 'Therapist',
      lastName: 'One',
      email: `therapist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`,
      gender: Gender.MALE,
      status: BaseStatus.ACTIVE,
      firebaseToken: null,
      avatar: 0,
      isEmailAuthenticated: false,
      isPhoneNumberAuthenticated: false,
      isLinked: false,
      isOnline: false,
      verified: false,
      hoursDedicatedPerWeek: 10,
      ...overrides,
    }),
  );
}

export async function createClient(
  repositories: {
    client: Repository<Client>;
  },
  overrides: Partial<Client> = {},
) {
  return repositories.client.save(
    repositories.client.create({
      firstName: 'Client',
      lastName: 'One',
      email: `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`,
      gender: Gender.MALE,
      status: BaseStatus.ACTIVE,
      avatar: 0,
      isEmailAuthenticated: false,
      isPhoneNumberAuthenticated: false,
      isLinked: false,
      isOnline: false,
      isVisible: false,
      isInGroup: false,
      ...overrides,
    }),
  );
}

export async function createClientSubscription(
  repositories: {
    clientSubscription: Repository<ClientSubscription>;
    client: Repository<Client>;
  },
  input: {
    client: Client;
    therapist: Therapist;
    subscription: Subscription;
    status?: SubscriptionStatus;
  },
) {
  const clientSubscription = await repositories.clientSubscription.save(
    repositories.clientSubscription.create({
      client: input.client,
      therapist: input.therapist,
      subscription: input.subscription,
      status: input.status ?? SubscriptionStatus.ACTIVE,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
      price: input.subscription.price,
      old_price: input.subscription.old_price,
      therapistPercentage: 0.3,
    }),
  );

  input.client.activeSubscription = clientSubscription;
  await repositories.client.save(input.client);

  return clientSubscription;
}

export async function createSessionRecord(
  repositories: {
    session: Repository<Session>;
  },
  input: Partial<Session> & {
    therapist: Therapist;
    modal: Modal;
    schedule: Date;
  },
) {
  return repositories.session.save(
    repositories.session.create({
      approvalStatus: ApprovalStatus.CONFIRMED,
      duration: 45,
      type: SessionType.VIDEO,
      hasclientAttended: false,
      hasTherapistAttended: false,
      groupName: null,
      note: null,
      latestReason: null,
      latestStatus: null,
      group: [],
      groupAttendance: [],
      groupSubscription: [],
      ...input,
    }),
  );
}
