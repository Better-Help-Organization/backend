import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { SessionNotif, SubscriptionStatus, SubscriptionType } from 'src/common/constants';
import {
  createClient,
  createClientSubscription,
  createSessionIntegrationApp,
  createSessionRecord,
  createTherapist,
  seedCatalog,
} from '../integration/create-session-integration-module';

describe('SessionService integration', () => {
  let context: Awaited<ReturnType<typeof createSessionIntegrationApp>>;
  let app: INestApplication;

  beforeAll(async () => {
    context = await createSessionIntegrationApp();
    app = context.app;
  });

  afterAll(async () => {
    context.guardSpies.forEach((spy) => spy.mockRestore());
    await app.close();
    if (context.dataSource.isInitialized) {
      await context.dataSource.destroy();
    }
    await context.moduleRef.close();
  });

  beforeEach(async () => {
    await context.dataSource.synchronize(true);
    jest.clearAllMocks();
  });

  it('reuses the same chat across a forward series reassignment instead of creating duplicate group chats', async () => {
    const { repositories, service, therapistService } = context;
    const { modal } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const oldTherapist = await createTherapist(repositories, {
      firstName: 'Old',
      email: 'old-therapist@test.local',
    });
    const newTherapist = await createTherapist(repositories, {
      firstName: 'New',
      email: 'new-therapist@test.local',
      firebaseToken: 'new-therapist-token',
    });
    const groupClient = await createClient(repositories, {
      email: 'group-client@test.local',
    });

    const sharedChat = await repositories.chat.save(
      repositories.chat.create({
        therapist: oldTherapist,
        client: null,
        group: [groupClient],
        groupName: 'Nike (with Old)',
        closed: false,
      }),
    );

    const commonId = 'common-integration-1';

    const selectedSession = await createSessionRecord(repositories, {
      therapist: oldTherapist,
      modal,
      chat: sharedChat,
      group: [groupClient],
      commonId,
      groupName: 'Nike',
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    await createSessionRecord(repositories, {
      therapist: oldTherapist,
      modal,
      chat: sharedChat,
      group: [groupClient],
      commonId,
      groupName: 'Nike',
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    });

    await createSessionRecord(repositories, {
      therapist: oldTherapist,
      modal,
      chat: sharedChat,
      group: [groupClient],
      commonId,
      groupName: 'Nike',
      schedule: new Date('2026-08-15T10:00:00.000Z'),
    });

    therapistService.findOne.mockImplementation(async (id: string) =>
      repositories.therapist.findOne({ where: { id } }),
    );

    await service.update(selectedSession.id, { therapist: newTherapist.id } as any);

    const sessions = await repositories.session.find({
      where: { commonId },
      relations: ['therapist', 'chat', 'group'],
      order: { schedule: 'ASC' },
    });
    const chats = await repositories.chat.find({
      relations: ['therapist', 'group'],
      order: { createdAt: 'ASC' },
    });

    expect(sessions).toHaveLength(3);
    expect(new Set(sessions.map((session) => session.therapist?.id))).toEqual(new Set([newTherapist.id]));
    expect(new Set(sessions.map((session) => session.chat?.id))).toEqual(new Set([sharedChat.id]));
    expect(chats).toHaveLength(1);
    expect(chats[0]).toEqual(
      expect.objectContaining({
        id: sharedChat.id,
        therapist: expect.objectContaining({ id: newTherapist.id }),
        groupName: 'Nike',
      }),
    );
  });

  it('deactivates the client subscription and clears activeSubscription when the final session is attended', async () => {
    const { repositories, service, therapistService } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'completion-therapist@test.local',
      firebaseToken: 'therapist-token',
    });
    const client = await createClient(repositories, {
      email: 'completion-client@test.local',
      firebaseToken: 'client-token',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
      hasTherapistAttended: true,
    });

    const finalSession = await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-08T10:00:00.000Z'),
      hasTherapistAttended: false,
    });

    therapistService.findOne.mockImplementation(async (id: string) =>
      repositories.therapist.findOne({ where: { id } }),
    );

    await service.update(finalSession.id, { hasTherapistAttended: true } as any);

    const refreshedClientSubscription = await repositories.clientSubscription.findOne({
      where: { id: clientSubscription.id },
      relations: ['client'],
    });
    const refreshedClient = await repositories.client.findOne({
      where: { id: client.id },
      relations: ['activeSubscription'],
    });

    expect(refreshedClientSubscription?.status).toBe(SubscriptionStatus.INACTIVE);
    expect(refreshedClient?.activeSubscription ?? null).toBeNull();
    expect(refreshedClient?.isInGroup).toBe(false);
  });

  it('reschedules a direct session, sends the reschedule notification, and refreshes reminders', async () => {
    const { repositories, service, firebaseService, reminderService } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'reschedule-therapist@test.local',
      firebaseToken: 'reschedule-therapist-token',
    });
    const client = await createClient(repositories, {
      email: 'reschedule-client@test.local',
      firebaseToken: 'reschedule-client-token',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const nextSchedule = new Date('2026-08-03T12:30:00.000Z');
    const updated = await service.update(session.id, { schedule: nextSchedule } as any);

    expect(new Date(updated.schedule).toISOString()).toBe(nextSchedule.toISOString());
    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      {
        client: ['reschedule-client-token'],
        therapist: ['reschedule-therapist-token'],
        admin: [],
      },
      JSON.stringify({
        sessionId: session.id,
        commonId: null,
        schedule: nextSchedule,
      }),
      SessionNotif.RE_SCHEDULED,
      expect.stringContaining('Your session has been updated for'),
    );
    expect(reminderService.cancelReminders).toHaveBeenCalledWith(session.id);
    expect(reminderService.scheduleReminders).toHaveBeenCalledWith(
      expect.objectContaining({ id: session.id }),
    );
  });

  it('persists status changes and emits the status-changed notification path', async () => {
    const { repositories, service, firebaseService } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'status-therapist@test.local',
      firebaseToken: 'status-therapist-token',
    });
    const client = await createClient(repositories, {
      email: 'status-client@test.local',
      firebaseToken: 'status-client-token',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const updated = await service.update(session.id, {
      status: {
        status: 'cancelled',
        reason: 'Client requested a different day',
      },
    } as any);

    expect(updated.latestStatus).toBe('cancelled');
    expect(updated.latestReason).toBe('Client requested a different day');
    expect(firebaseService.sendPushNotification).toHaveBeenCalledWith(
      {
        client: ['status-client-token'],
        therapist: ['status-therapist-token'],
        admin: [],
      },
      expect.stringContaining(`"sessionId":"${session.id}"`),
      SessionNotif.STATUS_CHANGED,
      'Your session status is now cancelled',
    );
  });

  it('adds a new client to all upcoming sessions in the group series and syncs the series chat', async () => {
    const { repositories, service, clientService } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'group-therapist@test.local',
      firebaseToken: 'group-therapist-token',
    });
    const existingClient = await createClient(repositories, {
      email: 'existing-group-client@test.local',
      firebaseToken: 'existing-group-client-token',
      isInGroup: true,
    });
    const newClient = await createClient(repositories, {
      email: 'new-group-client@test.local',
      firebaseToken: 'new-group-client-token',
      isInGroup: false,
    });

    const existingSub = await createClientSubscription(repositories, {
      client: existingClient,
      therapist,
      subscription,
    });
    const newSub = await createClientSubscription(repositories, {
      client: newClient,
      therapist,
      subscription,
    });

    await repositories.clientSubscription.update(newSub.id, {
      end_date: new Date('2026-08-08'),
    });

    const seriesChat = await repositories.chat.save(
      repositories.chat.create({
        therapist,
        client: null,
        group: [existingClient],
        groupName: 'Process Group',
        closed: false,
      }),
    );

    const commonId = 'common-add-integration-1';
    await createSessionRecord(repositories, {
      therapist,
      modal,
      chat: seriesChat,
      group: [existingClient],
      groupSubscription: [existingSub],
      commonId,
      groupName: 'Process Group',
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });
    await createSessionRecord(repositories, {
      therapist,
      modal,
      chat: seriesChat,
      group: [existingClient],
      groupSubscription: [existingSub],
      commonId,
      groupName: 'Process Group',
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    });
    const referenceSession = await repositories.session.find({
      where: { commonId },
      order: { schedule: 'ASC' },
      take: 1,
    });

    clientService.findAll.mockImplementation(async ({ ids }: { ids: string }) => {
      const requestedIds = ids.split(',');
      const clients = await repositories.client.find({
        where: requestedIds.map((id) => ({ id })),
      });
      return { data: clients };
    });

    const updatedSessions = await service.addToSession(referenceSession[0].id, {
      groupClients: [newClient.id],
    });

    const refreshedSessions = await repositories.session.find({
      where: { commonId },
      relations: ['group', 'groupSubscription', 'groupSubscription.client', 'chat', 'chat.group'],
      order: { schedule: 'ASC' },
    });
    const refreshedClient = await repositories.client.findOneOrFail({ where: { id: newClient.id } });
    const refreshedChat = await repositories.chat.findOneOrFail({
      where: { id: seriesChat.id },
      relations: ['group'],
    });

    expect(updatedSessions).toHaveLength(2);
    expect(refreshedClient.isInGroup).toBe(true);
    expect(refreshedSessions).toHaveLength(2);
    for (const session of refreshedSessions) {
      expect(session.group.map((client) => client.id)).toEqual(
        expect.arrayContaining([existingClient.id, newClient.id]),
      );
      expect(session.groupSubscription.map((clientSub) => clientSub.id)).toContain(newSub.id);
    }
    expect(refreshedChat.group.map((client) => client.id)).toEqual(
      expect.arrayContaining([existingClient.id, newClient.id]),
    );
  });

  it('removes a client only from upcoming group sessions, updates chat membership, and clears isInGroup when no future groups remain', async () => {
    const { repositories, service } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'remove-therapist@test.local',
      firebaseToken: 'remove-therapist-token',
    });
    const clientToRemove = await createClient(repositories, {
      email: 'remove-client@test.local',
      firebaseToken: 'remove-client-token',
      isInGroup: true,
    });

    const clientSub = await createClientSubscription(repositories, {
      client: clientToRemove,
      therapist,
      subscription,
    });

    const seriesChat = await repositories.chat.save(
      repositories.chat.create({
        therapist,
        client: null,
        group: [clientToRemove],
        groupName: 'Removal Group',
        closed: false,
      }),
    );

    const commonId = 'common-remove-integration-1';
    await createSessionRecord(repositories, {
      therapist,
      modal,
      chat: seriesChat,
      group: [clientToRemove],
      groupSubscription: [clientSub],
      commonId,
      groupName: 'Removal Group',
      schedule: new Date('2026-07-01T10:00:00.000Z'),
    });
    const futureSessionA = await createSessionRecord(repositories, {
      therapist,
      modal,
      chat: seriesChat,
      group: [clientToRemove],
      groupSubscription: [clientSub],
      commonId,
      groupName: 'Removal Group',
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });
    await createSessionRecord(repositories, {
      therapist,
      modal,
      chat: seriesChat,
      group: [clientToRemove],
      groupSubscription: [clientSub],
      commonId,
      groupName: 'Removal Group',
      schedule: new Date('2026-08-08T10:00:00.000Z'),
    });

    const result = await service.removeFromSession(futureSessionA.id, {
      groupClients: [clientToRemove.id],
    });

    const refreshedSessions = await repositories.session.find({
      where: { commonId },
      relations: ['group', 'groupSubscription', 'groupSubscription.client'],
      order: { schedule: 'ASC' },
    });
    const refreshedChat = await repositories.chat.findOneOrFail({
      where: { id: seriesChat.id },
      relations: ['group'],
    });
    const refreshedClient = await repositories.client.findOneOrFail({
      where: { id: clientToRemove.id },
    });

    expect(result).toBe('Clients successfully removed from upcoming group sessions');
    expect(refreshedSessions[0].group.map((client) => client.id)).toContain(clientToRemove.id);
    expect(refreshedSessions[1].group.map((client) => client.id)).not.toContain(clientToRemove.id);
    expect(refreshedSessions[2].group.map((client) => client.id)).not.toContain(clientToRemove.id);
    expect(refreshedSessions[1].groupSubscription).toHaveLength(0);
    expect(refreshedSessions[2].groupSubscription).toHaveLength(0);
    expect(refreshedChat.group.map((client) => client.id)).not.toContain(clientToRemove.id);
    expect(refreshedClient.isInGroup).toBe(false);
  });

  it('PATCH /session/:id reschedules a session through HTTP and triggers reminder refresh', async () => {
    const { repositories, reminderService } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'http-reschedule-therapist@test.local',
      firebaseToken: 'http-reschedule-therapist-token',
    });
    const client = await createClient(repositories, {
      email: 'http-reschedule-client@test.local',
      firebaseToken: 'http-reschedule-client-token',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const nextSchedule = '2026-08-05T09:15:00.000Z';
    const response = await request(app.getHttpServer())
      .patch(`/session/${session.id}`)
      .send({ schedule: nextSchedule })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: session.id,
        schedule: nextSchedule,
      }),
    );
    expect(reminderService.cancelReminders).toHaveBeenCalledWith(session.id);
    expect(reminderService.scheduleReminders).toHaveBeenCalledWith(
      expect.objectContaining({ id: session.id }),
    );
  });

  it('GET /session/:id respects explicit fields selection for nested relations', async () => {
    const { repositories } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      firstName: 'Nested',
      lastName: 'Therapist',
      email: 'http-fields-therapist@test.local',
    });
    const client = await createClient(repositories, {
      firstName: 'Nested',
      lastName: 'Client',
      email: 'http-fields-client@test.local',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      subscription: clientSubscription,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get(`/session/${session.id}`)
      .query({
        fields: 'id,schedule,therapist.id,therapist.firstName,client.id,client.firstName',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: session.id,
        schedule: expect.any(String),
        therapist: expect.objectContaining({
          id: therapist.id,
          firstName: 'Nested',
        }),
        client: expect.objectContaining({
          id: client.id,
          firstName: 'Nested',
        }),
      }),
    );
    expect(response.body.therapist.lastName).toBeUndefined();
    expect(response.body.therapist.email).toBeUndefined();
    expect(response.body.client.lastName).toBeUndefined();
    expect(response.body.client.email).toBeUndefined();
  });
});
