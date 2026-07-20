import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { ApprovalStatus, ExpertiseValues, SubscriptionType } from 'src/common/constants';
import {
  createClient,
  createClientSubscription,
  createSessionIntegrationApp,
  createSessionRecord,
  createTherapist,
  seedCatalog,
} from '../integration/create-session-integration-module';

describe('APIFeatures integration', () => {
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

  it('hydrates nested relations when only the deepest relation wildcard is requested', async () => {
    const { repositories } = context;
    const { modal } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      firstName: 'Deep',
      email: 'deep-therapist@test.local',
    });
    const client = await createClient(repositories, {
      email: 'deep-client@test.local',
    });

    await repositories.expertise.save(
      repositories.expertise.create([
        { therapist, expertise: ExpertiseValues.Anxiety },
        { therapist, expertise: ExpertiseValues.Depression },
      ]),
    );

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get(`/session/${session.id}`)
      .query({ fields: 'id,therapist.expertise.*' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: session.id,
        therapist: expect.objectContaining({
          id: therapist.id,
          expertise: expect.arrayContaining([
            expect.objectContaining({ expertise: ExpertiseValues.Anxiety }),
            expect.objectContaining({ expertise: ExpertiseValues.Depression }),
          ]),
        }),
      }),
    );
  });

  it('does not auto-apply eager relations when fields are not explicitly requested', async () => {
    const { repositories } = context;
    const { modal } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      firstName: 'Lean',
      email: 'lean-therapist@test.local',
    });
    const client = await createClient(repositories, {
      email: 'lean-client@test.local',
    });

    await repositories.expertise.save(
      repositories.expertise.create({
        therapist,
        expertise: ExpertiseValues.Anxiety,
      }),
    );

    const session = await createSessionRecord(repositories, {
      therapist,
      client,
      modal,
      schedule: new Date('2026-08-01T10:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get(`/session/${session.id}`)
      .query({ fields: 'id' })
      .expect(200);

    expect(response.body).toEqual({ id: session.id });
    expect(response.body.therapist).toBeUndefined();
    expect(response.body.paymentPeriod).toBeUndefined();
  });

  it('supports deep explicit field selection through chained relations', async () => {
    const { repositories } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'deep-chain-therapist@test.local',
    });
    const client = await createClient(repositories, {
      email: 'deep-chain-client@test.local',
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
        fields: 'id,subscription.id,subscription.subscription.modal.*,subscription.subscription.level.*',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: session.id,
        subscription: expect.objectContaining({
          id: clientSubscription.id,
          subscription: expect.objectContaining({
            modal: expect.objectContaining({ id: modal.id, name: modal.name }),
            level: expect.objectContaining({ id: subscription.level.id, type: subscription.level.type }),
          }),
        }),
      }),
    );
  });

  it('combines filters, sorting, pagination, and explicit fields predictably', async () => {
    const { repositories } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'query-therapist@test.local',
    });
    const client = await createClient(repositories, {
      email: 'query-client@test.local',
    });
    const clientSubscription = await createClientSubscription(repositories, {
      client,
      therapist,
      subscription,
    });

    const schedules = [
      '2026-08-01T10:00:00.000Z',
      '2026-08-02T10:00:00.000Z',
      '2026-08-03T10:00:00.000Z',
    ];

    for (const schedule of schedules) {
      await createSessionRecord(repositories, {
        therapist,
        client,
        subscription: clientSubscription,
        modal,
        approvalStatus: ApprovalStatus.CONFIRMED,
        schedule: new Date(schedule),
      });
    }

    const response = await request(app.getHttpServer())
      .get('/session')
      .query({
        fields: 'id,schedule',
        filters: `approvalStatus:=${ApprovalStatus.CONFIRMED},therapist.id:=${therapist.id}`,
        sort: 'schedule=DESC',
        page: '1',
        take: '2',
      })
      .expect(200);

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        totalItems: 3,
        totalPages: 2,
        currentPage: 1,
        pageSize: 2,
      }),
    );
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((session: { schedule: string }) => session.schedule)).toEqual([
      '2026-08-03T10:00:00.000Z',
      '2026-08-02T10:00:00.000Z',
    ]);
  });
});
