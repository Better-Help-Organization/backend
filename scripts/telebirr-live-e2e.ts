import 'reflect-metadata';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';
import { DataSource, Repository } from 'typeorm';
import {
  BaseStatus,
  Gender,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
  SubscriptionType,
  TokenPayload,
} from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { TelebirrController } from 'src/telebirr/telebirr.controller';
import { TelebirrService } from 'src/telebirr/telebirr.service';
import { ALL_TEST_ENTITIES } from 'test/integration/all-test-entities';
import { IntegrationNamingStrategy } from 'test/integration/integration-naming.strategy';
import { prepareTelebirrCaBundle, TelebirrCaBundle } from './telebirr-ca';

const axios = require(require.resolve('axios', { paths: [require.resolve('@nestjs/axios')] }));

type MysqlRuntime = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  containerName: string;
};

type LiveStatusUpdater = {
  update: (token: TokenPayload, id: string, dto: { status?: SubscriptionStatus }) => Promise<ClientSubscription>;
};

const runtimeEnv = process.env.TELEBIRR_APP_ENV || process.env.NODE_ENV || 'test';
process.env.NODE_ENV = runtimeEnv;
dotenv.config({ path: '.env' });
const scopedEnvPath = `.env.${runtimeEnv}`;
if (fs.existsSync(scopedEnvPath)) {
  dotenv.config({ path: scopedEnvPath, override: true });
}

const requiredEnv = [
  'BASE_URL',
  'WEB_BASE_URL',
  'FABRIC_APP_ID',
  'APP_SECRET',
  'MERCHANT_APP_ID',
  'MERCHANT_CODE',
  'PRIVATE_KEY',
] as const;

function assertRequiredEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function runDocker(args: string[]) {
  return execFileSync('docker', args, {
    stdio: 'pipe',
    encoding: 'utf8',
  }).trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startMysqlContainer(): Promise<MysqlRuntime> {
  const runtime: MysqlRuntime = {
    host: '127.0.0.1',
    port: 34000 + Math.floor(Math.random() * 1000),
    user: 'root',
    password: 'bh_test_root',
    database: 'bh_test_telebirr_live',
    containerName: `bh-mysql-telebirr-live-${Date.now()}-${process.pid}`,
  };

  runDocker([
    'run',
    '-d',
    '--rm',
    '--name',
    runtime.containerName,
    '-e',
    `MYSQL_ROOT_PASSWORD=${runtime.password}`,
    '-e',
    `MYSQL_DATABASE=${runtime.database}`,
    '-p',
    `${runtime.host}:${runtime.port}:3306`,
    'mysql:8.0.35',
    '--default-authentication-plugin=mysql_native_password',
  ]);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      runDocker([
        'exec',
        runtime.containerName,
        'mysqladmin',
        'ping',
        '-h127.0.0.1',
        '-uroot',
        `-p${runtime.password}`,
        '--silent',
      ]);
      return runtime;
    } catch {
      await sleep(2000);
    }
  }

  throw new Error('Timed out waiting for Telebirr live MySQL container to become ready');
}

function stopMysqlContainer(runtime: MysqlRuntime | null) {
  if (!runtime) return;
  try {
    runDocker(['rm', '-f', runtime.containerName]);
  } catch {
    // best effort cleanup
  }
}

function createTelebirrService(config: ConfigService, caBundle: TelebirrCaBundle) {
  const http = new HttpService(
    axios.create({
      timeout: 20000,
      httpsAgent: caBundle.httpsAgent,
    }),
  );

  const logger = {
    error: (...args: any[]) => console.error(...args),
    log: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
  };

  return {
    logger,
    telebirr: new TelebirrService(logger as any, http, config),
  };
}

async function buildDataSource(runtime: MysqlRuntime) {
  const dataSource = new DataSource({
    type: 'mysql',
    host: runtime.host,
    port: runtime.port,
    username: runtime.user,
    password: runtime.password,
    database: runtime.database,
    entities: ALL_TEST_ENTITIES as unknown as Function[],
    synchronize: true,
    dropSchema: true,
    namingStrategy: new IntegrationNamingStrategy(),
  });

  await dataSource.initialize();
  return dataSource;
}

async function seedCatalog(repos: {
  level: Repository<Level>;
  modal: Repository<Modal>;
  subscription: Repository<Subscription>;
}) {
  const level = await repos.level.save(
    repos.level.create({
      type: 'associate',
      minXP: 0,
      maxXP: 5,
      price: 1,
    }),
  );

  const modal = await repos.modal.save(
    repos.modal.create({
      name: 'Individual Therapy',
      order: 1,
      description: 'Telebirr live e2e modal',
    }),
  );

  const subscription = await repos.subscription.save(
    repos.subscription.create({
      type: SubscriptionType.MONTHLY,
      price: 1,
      old_price: null,
      is_admin_created: true,
      modal,
      level,
    }),
  );

  return { level, modal, subscription };
}

async function seedTherapist(repo: Repository<Therapist>) {
  return repo.save(
    repo.create({
      firstName: 'Telebirr',
      lastName: 'Therapist',
      email: `telebirr-therapist-${Date.now()}@test.local`,
      gender: Gender.MALE,
      status: BaseStatus.ACTIVE,
      avatar: 0,
      isEmailAuthenticated: false,
      isPhoneNumberAuthenticated: false,
      isLinked: false,
      isOnline: false,
      verified: false,
      hoursDedicatedPerWeek: 5,
      expertise: [],
    }),
  );
}

async function seedClient(repo: Repository<Client>) {
  return repo.save(
    repo.create({
      firstName: 'Telebirr',
      lastName: 'Client',
      email: `telebirr-client-${Date.now()}@test.local`,
      username: `telebirr_client_${Date.now()}`,
      gender: Gender.MALE,
      status: BaseStatus.ACTIVE,
      avatar: 0,
      isEmailAuthenticated: false,
      isPhoneNumberAuthenticated: false,
      isLinked: false,
      isOnline: false,
      isVisible: false,
      isInGroup: false,
    }),
  );
}

async function seedClientSubscription(
  repos: {
    clientSubscription: Repository<ClientSubscription>;
    client: Repository<Client>;
  },
  input: {
    client: Client;
    therapist: Therapist;
    subscription: Subscription;
  },
) {
  const clientSubscription = await repos.clientSubscription.save(
    repos.clientSubscription.create({
      client: input.client,
      therapist: input.therapist,
      subscription: input.subscription,
      status: SubscriptionStatus.INACTIVE,
      start_date: null,
      end_date: null,
      price: input.subscription.price,
      old_price: input.subscription.old_price,
      therapistPercentage: 0.3,
    }),
  );

  input.client.activeSubscription = null;
  await repos.client.save(input.client);

  return clientSubscription;
}

function createSubscriptionStatusUpdater(dataSource: DataSource): LiveStatusUpdater {
  return {
    update: async (_token, id, dto) => {
      const clientSubscriptionRepo = dataSource.getRepository(ClientSubscription);
      const clientRepo = dataSource.getRepository(Client);

      const subscription = await clientSubscriptionRepo.findOne({
        where: { id },
        relations: ['client', 'subscription'],
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      if (!dto.status) {
        return subscription;
      }

      subscription.status = dto.status;

      if (dto.status === SubscriptionStatus.ACTIVE) {
        const now = new Date();
        const durationMonths = subscription.subscription.type;
        subscription.start_date = now;
        subscription.end_date =
          durationMonths === SubscriptionType.TRIAL
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            : new Date(new Date(now).setMonth(now.getMonth() + Number(durationMonths)));
      }

      await clientSubscriptionRepo.save(subscription);

      const client = await clientRepo.findOne({ where: { id: subscription.client.id } });
      if (!client) {
        throw new NotFoundException(`Client with ID ${subscription.client.id} not found`);
      }

      client.activeSubscription = dto.status === SubscriptionStatus.ACTIVE ? subscription : null;
      await clientRepo.save(client);

      return subscription;
    },
  };
}

function maybeOpenCheckout(url: string) {
  if (process.env.TELEBIRR_OPEN_BROWSER === 'false') {
    return;
  }

  if (process.platform === 'darwin') {
    const result = spawnSync('open', [url], { stdio: 'ignore' });
    if (result.status === 0) {
      console.log('Opened checkout URL in the default browser.');
    }
  }
}

async function waitForCompletion(telebirr: TelebirrService, merchOrderId: string) {
  const timeoutMs = Number(process.env.TELEBIRR_WAIT_TIMEOUT_MS || 15 * 60 * 1000);
  const intervalMs = Number(process.env.TELEBIRR_POLL_INTERVAL_MS || 5000);
  const deadline = Date.now() + timeoutMs;
  let lastStatus: string | null = null;

  while (Date.now() < deadline) {
    const query = await telebirr.queryOrder(merchOrderId);
    const status = telebirr.getTradeStatus(query);

    if (status !== lastStatus) {
      console.log(`Telebirr order status: ${status ?? 'UNKNOWN'}`);
      lastStatus = status;
    }

    if (telebirr.isSuccessfulTradeStatus(status) || telebirr.isFailedTradeStatus(status)) {
      return { query, status };
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for Telebirr order ${merchOrderId} to leave pending state`);
}

async function main() {
  assertRequiredEnv();

  let runtime: MysqlRuntime | null = null;
  let dataSource: DataSource | null = null;
  let caBundle: TelebirrCaBundle | null = null;

  try {
    caBundle = await prepareTelebirrCaBundle();
    console.log(`Using Telebirr CA bundle: ${caBundle.caBundlePath ?? 'system trust store'}`);

    runtime = await startMysqlContainer();
    dataSource = await buildDataSource(runtime);

    const repos = {
      level: dataSource.getRepository(Level),
      modal: dataSource.getRepository(Modal),
      subscription: dataSource.getRepository(Subscription),
      therapist: dataSource.getRepository(Therapist),
      client: dataSource.getRepository(Client),
      clientSubscription: dataSource.getRepository(ClientSubscription),
      payment: dataSource.getRepository(Payment),
    };

    const { subscription } = await seedCatalog(repos);
    const therapist = await seedTherapist(repos.therapist);
    const client = await seedClient(repos.client);
    const clientSubscription = await seedClientSubscription(repos, {
      client,
      therapist,
      subscription,
    });

    const config = new ConfigService(process.env as Record<string, string>);
    const { logger, telebirr } = createTelebirrService(config, caBundle);
    const subscriptionUpdater = createSubscriptionStatusUpdater(dataSource);
    const controller = new TelebirrController(
      telebirr,
      subscriptionUpdater as any,
      logger as any,
      repos.payment as any,
      repos.clientSubscription as any,
    );

    const token = { id: client.id } as TokenPayload;
    const checkoutUrl = await controller.createOrder(token, {
      subscriptionId: clientSubscription.id,
      title: 'Telebirr Live E2E',
    } as any);

    const [paymentRow] = await dataSource.query(
      'select id, status, providerOrderId, providerPrepayId, subscriptionId from payment order by createdAt desc limit 1',
    );

    if (!paymentRow?.id) {
      throw new BadRequestException('No payment row was created by the Telebirr order flow');
    }

    if (!paymentRow.providerOrderId) {
      throw new BadRequestException('Payment was created but providerOrderId was not persisted');
    }

    if (!paymentRow.subscriptionId) {
      throw new BadRequestException('Payment was created but subscriptionId was not persisted');
    }

    const payment = await repos.payment.findOne({
      where: { id: paymentRow.id },
      relations: ['subscription'],
    });

    console.log('ORDER_CREATED');
    console.log(
      JSON.stringify(
        {
          checkoutUrl,
          paymentId: payment.id,
          paymentStatus: payment.status,
          subscriptionStatus: clientSubscription.status,
          merchOrderId: payment.providerOrderId,
          prepayId: payment.providerPrepayId,
        },
        null,
        2,
      ),
    );

    maybeOpenCheckout(checkoutUrl);

    if (process.env.TELEBIRR_SKIP_WAIT === 'true') {
      console.log('Skipping payment wait/reconciliation because TELEBIRR_SKIP_WAIT=true');
      return;
    }

    console.log('Complete the sandbox payment in the opened browser. Waiting for Telebirr status change...');
    const { status } = await waitForCompletion(telebirr, payment.providerOrderId);

    const callbackResponse = await controller.handleNotification({
      merch_order_id: payment.providerOrderId,
      callback_info: payment.id,
    });

    const finalPayment = await repos.payment.findOne({
      where: { id: payment.id },
      relations: ['subscription', 'subscription.client'],
    });
    const finalSubscription = await repos.clientSubscription.findOne({
      where: { id: clientSubscription.id },
      relations: ['client'],
    });
    const finalClient = await repos.client.findOne({
      where: { id: client.id },
      relations: ['activeSubscription'],
    });

    console.log('RECONCILE_RESULT');
    console.log(
      JSON.stringify(
        {
          callbackResponse,
          telebirrTradeStatus: status,
          paymentStatus: finalPayment?.status,
          providerTransactionId: finalPayment?.providerTransactionId ?? null,
          subscriptionStatus: finalSubscription?.status,
          activeSubscriptionId: finalClient?.activeSubscription?.id ?? null,
        },
        null,
        2,
      ),
    );

    if (telebirr.isSuccessfulTradeStatus(status)) {
      if (finalPayment?.status !== PaymentStatus.ACCEPTED) {
        throw new Error(`Expected accepted payment, got ${finalPayment?.status ?? 'null'}`);
      }
      if (finalSubscription?.status !== SubscriptionStatus.ACTIVE) {
        throw new Error(`Expected active subscription, got ${finalSubscription?.status ?? 'null'}`);
      }
      if (finalClient?.activeSubscription?.id !== clientSubscription.id) {
        throw new Error('Client activeSubscription was not promoted to the paid subscription');
      }
    }

    if (telebirr.isFailedTradeStatus(status)) {
      if (finalPayment?.status !== PaymentStatus.REJECTED) {
        throw new Error(`Expected rejected payment, got ${finalPayment?.status ?? 'null'}`);
      }
      if (finalSubscription?.status !== SubscriptionStatus.INACTIVE) {
        throw new Error(`Expected inactive subscription, got ${finalSubscription?.status ?? 'null'}`);
      }
    }
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    stopMysqlContainer(runtime);
    if (caBundle) {
      await caBundle.cleanup().catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error('TELEBIRR_LIVE_E2E_FAILED');
  console.error(error?.response?.data ?? error?.message ?? error);
  process.exit(1);
});
