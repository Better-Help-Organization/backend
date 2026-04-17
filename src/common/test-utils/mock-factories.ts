import {
  BaseStatus,
  Gender,
  SubscriptionStatus,
  SubscriptionType,
} from '../constants';
import { Client } from '../entities/client.entity';
import { ClientSubscription } from '../entities/client-subscription.entity';
import { Subscription } from '../entities/subscription.entity';
import { Therapist } from '../entities/therapist.entity';

export function makeClient(overrides: Partial<Client> = {}): Client {
  const ts = Date.now();
  return {
    id: `client-${ts}-${Math.random().toString(36).slice(2, 6)}`,
    firstName: 'Test',
    lastName: 'Client',
    email: `test-${ts}@test.com`,
    gender: Gender.MALE,
    status: BaseStatus.ACTIVE,
    isInGroup: false,
    firebaseToken: null,
    activeSubscription: null,
    ...overrides,
  } as Client;
}

export function makeTherapist(overrides: Partial<Therapist> = {}): Therapist {
  const ts = Date.now();
  return {
    id: `therapist-${ts}`,
    firstName: 'Test',
    lastName: 'Therapist',
    email: `therapist-${ts}@test.com`,
    gender: Gender.MALE,
    status: BaseStatus.ACTIVE,
    firebaseToken: null,
    ...overrides,
  } as Therapist;
}

export function makeSubscription(type: SubscriptionType): Subscription {
  return {
    id: `sub-catalog-${type}`,
    type,
    price: 1000,
    old_price: 1200,
  } as Subscription;
}

export function makeClientSubscription(
  client: Client,
  subscription: Subscription,
  therapist: Therapist,
): ClientSubscription {
  return {
    id: `cs-${client.id}-${subscription.type}`,
    client,
    therapist,
    subscription,
    status: SubscriptionStatus.ACTIVE,
    start_date: new Date(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    price: subscription.price,
    session: [],
    groupSessions: [],
  } as unknown as ClientSubscription;
}
