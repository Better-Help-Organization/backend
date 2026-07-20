import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionNotif, SubscriptionStatus, SubscriptionType } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { ParameterService } from 'src/parameter/parameter.service';
import { makeClient, makeClientSubscription, makeSubscription, makeTherapist } from '../common/test-utils/mock-factories';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService lifecycle', () => {
  let service: SubscriptionService;
  let subscriptionRepo: { findOne: jest.Mock; createQueryBuilder: jest.Mock; save: jest.Mock };
  let clientSubRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let levelRepo: { findOne: jest.Mock };
  let preferenceRepo: { findOne: jest.Mock };
  let clientRepo: { findOne: jest.Mock; save: jest.Mock };
  let firebaseService: { sendPushNotification: jest.Mock };
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };
  let paramService: { getAllParsedParams: jest.Mock };

  beforeEach(async () => {
    subscriptionRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(async (entity: any) => entity),
    };
    clientSubRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(async (entity: any) => entity),
    };
    levelRepo = { findOne: jest.fn() };
    preferenceRepo = { findOne: jest.fn() };
    clientRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: any) => entity),
    };
    firebaseService = { sendPushNotification: jest.fn() };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    paramService = { getAllParsedParams: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(ClientSubscription), useValue: clientSubRepo },
        { provide: getRepositoryToken(Level), useValue: levelRepo },
        { provide: getRepositoryToken(Preference), useValue: preferenceRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: FirebaseService, useValue: firebaseService },
        { provide: LoggerService, useValue: logger },
        { provide: ParameterService, useValue: paramService },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  it('activates a trial subscription for 7 days and assigns it as active', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const catalog = makeSubscription(SubscriptionType.TRIAL);
    const clientSubscription = makeClientSubscription(client, catalog, therapist);
    clientSubscription.status = SubscriptionStatus.INACTIVE;

    clientSubRepo.findOne.mockResolvedValue(clientSubscription);
    clientSubRepo.find.mockResolvedValue([]);
    clientRepo.save.mockImplementation(async (entity: any) => entity);

    const before = Date.now();
    const result = await service.update({ id: client.id } as any, clientSubscription.id, {
      status: SubscriptionStatus.ACTIVE,
    });
    const after = Date.now();

    expect(result?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(result?.client?.activeSubscription?.id).toBe(clientSubscription.id);
    expect(result?.start_date).toBeTruthy();
    const endMs = new Date(result!.end_date).getTime();
    expect(endMs).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(endMs).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000 + 1000);
    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      { client: ['client-token'] },
      'Subscription Status Changed',
      SessionNotif.STATUS_CHANGED,
      expect.stringContaining('Your subscription is now active.'),
    );
  });

  it('activating a later subscription pauses the older active one and promotes the latest end date', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1' });
    const oldCatalog = makeSubscription(SubscriptionType.MONTHLY);
    const newCatalog = makeSubscription(SubscriptionType.QUARTERLY);

    const oldSub = makeClientSubscription(client, oldCatalog, therapist);
    oldSub.id = 'old-sub';
    oldSub.status = SubscriptionStatus.ACTIVE;
    oldSub.end_date = new Date('2026-08-01T00:00:00.000Z');

    const newSub = makeClientSubscription(client, newCatalog, therapist);
    newSub.id = 'new-sub';
    newSub.status = SubscriptionStatus.INACTIVE;
    client.activeSubscription = oldSub;

    clientSubRepo.findOne.mockResolvedValue(newSub);
    clientSubRepo.find.mockResolvedValue([oldSub]);
    clientRepo.save.mockImplementation(async (entity: any) => entity);

    await service.update({ id: client.id } as any, newSub.id, {
      status: SubscriptionStatus.ACTIVE,
    });

    expect(oldSub.status).toBe(SubscriptionStatus.PAUSED);
    expect(newSub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(client.activeSubscription?.id).toBe('new-sub');
  });

  it('deactivating the current active subscription clears the active link instead of promoting siblings', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1', firebaseToken: 'client-token' });
    const oldCatalog = makeSubscription(SubscriptionType.MONTHLY);
    const newerCatalog = makeSubscription(SubscriptionType.QUARTERLY);

    const currentSub = makeClientSubscription(client, newerCatalog, therapist);
    currentSub.id = 'current-sub';
    currentSub.status = SubscriptionStatus.ACTIVE;
    currentSub.end_date = new Date('2026-10-01T00:00:00.000Z');

    const pausedSub = makeClientSubscription(client, oldCatalog, therapist);
    pausedSub.id = 'paused-sub';
    pausedSub.status = SubscriptionStatus.PAUSED;
    pausedSub.end_date = new Date('2026-12-01T00:00:00.000Z');

    client.activeSubscription = currentSub;

    clientSubRepo.findOne.mockResolvedValue(currentSub);
    clientRepo.findOne.mockResolvedValue(client);
    clientRepo.save.mockImplementation(async (entity: any) => entity);

    await service.update({ id: client.id } as any, currentSub.id, {
      status: SubscriptionStatus.INACTIVE,
    });

    expect(currentSub.status).toBe(SubscriptionStatus.INACTIVE);
    expect(pausedSub.status).toBe(SubscriptionStatus.PAUSED);
    expect(client.activeSubscription).toBeNull();
  });

  it('deactivating the only active subscription clears the client activeSubscription link', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1' });
    const catalog = makeSubscription(SubscriptionType.MONTHLY);
    const currentSub = makeClientSubscription(client, catalog, therapist);
    currentSub.id = 'current-sub';
    currentSub.status = SubscriptionStatus.ACTIVE;
    client.activeSubscription = currentSub;

    clientSubRepo.findOne.mockResolvedValue(currentSub);
    clientRepo.findOne.mockResolvedValue(client);
    clientSubRepo.find.mockResolvedValue([currentSub]);
    clientRepo.save.mockImplementation(async (entity: any) => entity);

    await service.update({ id: client.id } as any, currentSub.id, {
      status: SubscriptionStatus.CANCELED,
    });

    expect(client.activeSubscription).toBeNull();
  });

  it('canceling a non-active subscription does not clear the client activeSubscription link', async () => {
    const therapist = makeTherapist({ id: 'therapist-1' });
    const client = makeClient({ id: 'client-1' });
    const activeCatalog = makeSubscription(SubscriptionType.MONTHLY);
    const pausedCatalog = makeSubscription(SubscriptionType.QUARTERLY);

    const activeSub = makeClientSubscription(client, activeCatalog, therapist);
    activeSub.id = 'active-sub';
    activeSub.status = SubscriptionStatus.ACTIVE;

    const pausedSub = makeClientSubscription(client, pausedCatalog, therapist);
    pausedSub.id = 'paused-sub';
    pausedSub.status = SubscriptionStatus.PAUSED;

    client.activeSubscription = activeSub;

    clientSubRepo.findOne.mockResolvedValue(pausedSub);
    clientRepo.save.mockImplementation(async (entity: any) => entity);

    await service.update({ id: client.id } as any, pausedSub.id, {
      status: SubscriptionStatus.CANCELED,
    });

    expect(pausedSub.status).toBe(SubscriptionStatus.CANCELED);
    expect(client.activeSubscription?.id).toBe('active-sub');
    expect(clientRepo.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ activeSubscription: null }),
    );
  });
});
