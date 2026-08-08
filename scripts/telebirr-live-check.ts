import 'reflect-metadata';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { TelebirrService } from 'src/telebirr/telebirr.service';
import { prepareTelebirrCaBundle, shouldUseCustomTelebirrCa } from './telebirr-ca';

const axios = require(require.resolve('axios', { paths: [require.resolve('@nestjs/axios')] }));

dotenv.config({ path: '.env' });

const pendingStatuses = new Set(['WAIT_PAY', 'PAYING', 'Pending', 'Paying']);
const requiredEnv = [
  'BASE_URL',
  'WEB_BASE_URL',
  'FABRIC_APP_ID',
  'APP_SECRET',
  'MERCHANT_APP_ID',
  'MERCHANT_CODE',
  'PRIVATE_KEY',
] as const;

type LoggerLike = {
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};

function assertRequiredEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

function createLogger(): LoggerLike {
  return {
    error: (...args: any[]) => console.error(...args),
    log: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
  };
}

async function main() {
  assertRequiredEnv();

  const caBundle = await prepareTelebirrCaBundle();
  console.log(
    shouldUseCustomTelebirrCa()
      ? `Using Telebirr CA bundle: ${caBundle.caBundlePath ?? 'custom trust store'}`
      : 'Using Telebirr system trust store',
  );

  try {
    const config = new ConfigService(process.env as Record<string, string>);
    const http = new HttpService(
      axios.create({
        timeout: 20000,
        httpsAgent: caBundle.httpsAgent,
      }),
    );
    const logger = createLogger();
    const telebirr = new TelebirrService(logger as any, http, config);

    const paymentId = `live-check-payment-${Date.now()}`;
    const subscriptionId = `live-check-subscription-${Date.now()}`;

    const order = await telebirr.createOrder({
      title: 'Telebirr Live Check',
      amount: 1,
      paymentId,
      subscriptionId,
    });

    console.log('CREATE_ORDER_OK');
    console.log(
      JSON.stringify(
        {
          checkoutUrl: order.checkoutUrl,
          merchOrderId: order.merchOrderId,
          prepayId: order.prepayId,
        },
        null,
        2,
      ),
    );

    const query = await telebirr.queryOrder(order.merchOrderId);
    const status = telebirr.getTradeStatus(query);

    if (query?.result !== 'SUCCESS') {
      throw new Error(`Telebirr queryOrder returned result=${query?.result ?? 'UNKNOWN'}`);
    }

    if (!status || !pendingStatuses.has(status)) {
      throw new Error(`Expected a pending Telebirr order status, got ${status ?? 'null'}`);
    }

    console.log('QUERY_ORDER_OK');
    console.log(
      JSON.stringify(
        {
          result: query.result,
          merchOrderId: query?.biz_content?.merch_order_id,
          orderStatus: status,
          totalAmount: query?.biz_content?.total_amount,
          transCurrency: query?.biz_content?.trans_currency,
        },
        null,
        2,
      ),
    );
  } finally {
    await caBundle.cleanup();
  }
}

main().catch((error) => {
  console.error('TELEBIRR_LIVE_CHECK_FAILED');
  console.error(error?.response?.data ?? error?.message ?? error);
  process.exit(1);
});
