import { SubscriptionType } from 'src/common/constants';
import {
  createClient,
  createClientSubscription,
  createSessionIntegrationModule,
  createSessionRecord,
  createTherapist,
  seedCatalog,
} from './create-session-integration-module';

describe('Schema safety integration', () => {
  let context: Awaited<ReturnType<typeof createSessionIntegrationModule>>;

  beforeAll(async () => {
    context = await createSessionIntegrationModule();
  });

  afterAll(async () => {
    if (context.dataSource.isInitialized) {
      await context.dataSource.destroy();
    }
    await context.moduleRef.close();
  });

  beforeEach(async () => {
    await context.dataSource.synchronize(true);
    jest.clearAllMocks();
  });

  it('boots from an empty schema and keeps foreign key names unique', async () => {
    await expect(context.dataSource.synchronize(true)).resolves.toBeUndefined();

    const foreignKeyNames = context.dataSource.entityMetadatas
      .flatMap((meta) => meta.foreignKeys.map((fk) => fk.name))
      .filter(Boolean);

    const duplicates = foreignKeyNames.filter(
      (name, index) => foreignKeyNames.indexOf(name) !== index,
    );

    expect(duplicates).toEqual([]);
  });

  it('supports soft delete and recover without leaking deleted rows into default queries', async () => {
    const { repositories } = context;
    const { subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);

    await repositories.subscription.softRemove(subscription);

    const hidden = await repositories.subscription.findOne({
      where: { id: subscription.id },
    });
    const deleted = await repositories.subscription.findOne({
      where: { id: subscription.id },
      withDeleted: true,
    });

    expect(hidden).toBeNull();
    expect(deleted).not.toBeNull();

    await repositories.subscription.recover(deleted!);

    const restored = await repositories.subscription.findOne({
      where: { id: subscription.id },
    });
    expect(restored).not.toBeNull();
  });

  it('keeps foreign keys consistent when a catalog subscription is deleted', async () => {
    const { repositories } = context;
    const { modal, subscription } = await seedCatalog(repositories, SubscriptionType.MONTHLY);
    const therapist = await createTherapist(repositories, {
      email: 'schema-therapist@test.local',
    });
    const client = await createClient(repositories, {
      email: 'schema-client@test.local',
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
    });

    await repositories.subscription.remove(subscription);

    const survivingClientSubscription = await repositories.clientSubscription.findOne({
      where: { id: clientSubscription.id },
      withDeleted: true,
    });
    const survivingSession = await repositories.session.findOne({
      where: { subscription: { id: clientSubscription.id } },
      withDeleted: true,
    });
    const refreshedClient = await repositories.client.findOne({
      where: { id: client.id },
      relations: ['activeSubscription'],
    });

    expect(survivingClientSubscription).toBeNull();
    expect(survivingSession).toBeNull();
    expect(refreshedClient?.activeSubscription ?? null).toBeNull();
  });
});
