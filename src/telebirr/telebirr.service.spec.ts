import { of } from 'rxjs';
import { LoggerService } from 'src/logger/logger.service';
import { TelebirrService } from './telebirr.service';
const tools = require('src/common/utils/tools');

jest.mock('src/common/utils/tools', () => ({
  signRequestObject: jest.fn(() => 'signed-value'),
  createNonceStr: jest.fn(() => 'NONCE1234567890123456789012345678'),
  createTimeStamp: jest.fn(() => 1700000000),
}));

describe('TelebirrService', () => {
  let service: TelebirrService;
  let httpService: { post: jest.Mock };
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };
  let logger: { error: jest.Mock; log: jest.Mock };

  beforeEach(() => {
    tools.signRequestObject.mockReturnValue('signed-value');
    httpService = { post: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          BASE_URL: 'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway',
          WEB_BASE_URL: 'https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?',
          FABRIC_APP_ID: 'fabric-app',
          APP_SECRET: 'secret',
          MERCHANT_APP_ID: 'merchant-app',
          MERCHANT_CODE: 'merchant-code',
          PRIVATE_KEY: 'fake-private-key',
          HOST: 'Host(`app.navithera.com`) && PathPrefix(`/test`)',
        };

        return values[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'APP_SECRET') return 'secret';
        throw new Error(`Unexpected getOrThrow key ${key}`);
      }),
    };
    logger = { error: jest.fn(), log: jest.fn() };

    service = new TelebirrService(logger as unknown as LoggerService, httpService as any, configService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a checkout order with compact callback correlation data', async () => {
    httpService.post
      .mockReturnValueOnce(of({ data: { token: 'fabric-token' } }))
      .mockReturnValueOnce(
        of({
          data: {
            result: 'SUCCESS',
            code: '0',
            biz_content: {
              merch_order_id: '1700000000ORDER',
              prepay_id: 'PREPAY-123',
            },
          },
        }),
      );

    const result = await service.createOrder({
      title: 'Subscription payment',
      amount: 600,
      subscriptionId: 'sub-1',
      paymentId: 'payment-1',
    });

    const [, createOrderBody] = httpService.post.mock.calls[1];

    expect(createOrderBody.biz_content.notify_url).toBe('https://app.navithera.com/test/api/v1/telebirr/verify');
    expect(createOrderBody.biz_content.redirect_url).toBe('https://app.navithera.com/test');
    expect(createOrderBody.biz_content.callback_info).toBe('payment-1');
    expect(result.merchOrderId).toBe('1700000000ORDER');
    expect(result.prepayId).toBe('PREPAY-123');
    expect(result.checkoutUrl).toContain('PREPAY-123');
    expect(result.navigationUrl).toBe(
      `https://app.navithera.com/test/public/index.html?url=${encodeURIComponent(result.checkoutUrl)}`,
    );
  });

  it('URL-encodes the checkout sign parameter', async () => {
    tools.signRequestObject.mockReturnValue('a+b/c=');
    httpService.post
      .mockReturnValueOnce(of({ data: { token: 'fabric-token' } }))
      .mockReturnValueOnce(
        of({
          data: {
            result: 'SUCCESS',
            code: '0',
            biz_content: {
              merch_order_id: '1700000000ORDER',
              prepay_id: 'PREPAY-123',
            },
          },
        }),
      );

    const result = await service.createOrder({
      title: 'Subscription payment',
      amount: 600,
      subscriptionId: 'sub-1',
      paymentId: 'payment-1',
    });

    expect(result.checkoutUrl).toContain('sign=a%2Bb%2Fc%3D');
    expect(result.navigationUrl).toContain(encodeURIComponent(result.checkoutUrl));
  });

  it('queries order status using the merchant order id', async () => {
    httpService.post
      .mockReturnValueOnce(of({ data: { token: 'fabric-token' } }))
      .mockReturnValueOnce(
        of({
          data: {
            result: 'SUCCESS',
            biz_content: {
              merch_order_id: 'ORDER-1',
              order_status: 'PAY_SUCCESS',
              total_amount: '600.00',
              trans_currency: 'ETB',
            },
          },
        }),
      );

    const result = await service.queryOrder('ORDER-1');

    const [, queryBody] = httpService.post.mock.calls[1];

    expect(queryBody.method).toBe('payment.queryorder');
    expect(queryBody.biz_content.merch_order_id).toBe('ORDER-1');
    expect(result.biz_content.order_status).toBe('PAY_SUCCESS');
  });
});
