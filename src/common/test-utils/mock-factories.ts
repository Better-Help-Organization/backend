import {
  ApprovalStatus,
  BaseStatus,
  Gender,
  SessionType,
  SubscriptionStatus,
  SubscriptionType,
  TokenPayload,
  UserTypes,
} from '../constants';
import { Chat } from '../entities/chat.entity';
import { Client } from '../entities/client.entity';
import { ClientSubscription } from '../entities/client-subscription.entity';
import { Session } from '../entities/session.entity';
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
    avatar: 0,
    profile: null,
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
    avatar: 0,
    profile: null,
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

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    group: [],
    groupSubscription: [],
    client: null,
    commonId: `common-${Date.now()}`,
    schedule: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    duration: 60,
    type: SessionType.VIDEO,
    approvalStatus: ApprovalStatus.CONFIRMED,
    groupName: 'Test Group',
    therapist: null,
    modal: null,
    hasTherapistAttended: false,
    hasclientAttended: false,
    ...overrides,
  } as unknown as Session;
}

export function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    client: null,
    therapist: null,
    group: [],
    groupName: null,
    activeCallRoom: null,
    message: [],
    lastMessage: null,
    closed: false,
    ...overrides,
  } as unknown as Chat;
}

export function makeTokenPayload(
  id: string,
  type: UserTypes,
  name = 'Test',
): TokenPayload {
  return { id, name, status: BaseStatus.ACTIVE, type };
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
