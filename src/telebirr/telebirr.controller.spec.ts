import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentMethod, PaymentStatus, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { LoggerService } from 'src/logger/logger.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { TelebirrController } from './telebirr.controller';
import { TelebirrService } from './telebirr.service';

describe('TelebirrController', () => {
  let controller: TelebirrController;
  let paymentRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findOne: jest.Mock;
  };
  let clientSubscriptionRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let teleService: {
    createOrder: jest.Mock;
    parseCallbackInfo: jest.Mock;
    queryOrder: jest.Mock;
    getTradeStatus: jest.Mock;
    isSuccessfulTradeStatus: jest.Mock;
    isFailedTradeStatus: jest.Mock;
  };
  let subscriptionService: { update: jest.Mock };
  let logger: { error: jest.Mock };

  beforeEach(async () => {
    paymentRepo = {
      create: jest.fn((entity: any) => entity),
      save: jest.fn(async (entity: any) => entity),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
    };
    clientSubscriptionRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: any) => entity),
      update: jest.fn(),
    };
    teleService = {
      createOrder: jest.fn(),
      parseCallbackInfo: jest.fn(),
      queryOrder: jest.fn(),
      getTradeStatus: jest.fn(),
      isSuccessfulTradeStatus: jest.fn(),
      isFailedTradeStatus: jest.fn(),
    };
    subscriptionService = { update: jest.fn() };
    logger = { error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelebirrController],
      providers: [
        { provide: TelebirrService, useValue: teleService },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: LoggerService, useValue: logger },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(ClientSubscription), useValue: clientSubscriptionRepo },
      ],
    }).compile();

    controller = module.get(TelebirrController);
  });

  it('creates a payment record, persists gateway ids, and marks the subscription pending', async () => {
    const clientSub = {
      id: 'sub-1',
      price: 600,
      status: SubscriptionStatus.INACTIVE,
      client: { id: 'client-1' },
      subscription: { id: 'catalog-1' },
    };

    clientSubscriptionRepo.findOne.mockResolvedValue(clientSub);
    paymentRepo.save.mockResolvedValue({
      id: 'payment-1',
      amount: 600,
      method: PaymentMethod.TELEBIRR,
      status: PaymentStatus.PENDING,
      subscription: clientSub,
    });
    teleService.createOrder.mockResolvedValue({
      checkoutUrl: 'https://checkout.example',
      navigationUrl: 'https://app.navithera.com/test/public/index.html?url=https%3A%2F%2Fcheckout.example',
      merchOrderId: 'ORDER-1',
      prepayId: 'PREPAY-1',
      gatewayResponse: { result: 'SUCCESS' },
    });

    const result = await controller.createOrder(
      { id: 'client-1' } as any,
      { subscriptionId: 'sub-1', title: 'Title' } as any,
    );

    expect(result).toBe('https://app.navithera.com/test/public/index.html?url=https%3A%2F%2Fcheckout.example');
    expect(teleService.createOrder).toHaveBeenCalledWith({
      title: 'Title',
      amount: 600,
      subscriptionId: 'sub-1',
      paymentId: 'payment-1',
    });
    expect(clientSub.status).toBe(SubscriptionStatus.PENDING);
    expect(clientSubscriptionRepo.update).toHaveBeenCalledWith('sub-1', {
      status: SubscriptionStatus.PENDING,
    });
    expect(paymentRepo.update).toHaveBeenCalledWith('payment-1', {
      providerOrderId: 'ORDER-1',
      providerPrepayId: 'PREPAY-1',
      providerPayload: expect.objectContaining({
        checkoutUrl: 'https://checkout.example',
        navigationUrl: 'https://app.navithera.com/test/public/index.html?url=https%3A%2F%2Fcheckout.example',
      }),
      receipt: 'https://app.navithera.com/test/public/index.html?url=https%3A%2F%2Fcheckout.example',
    });
  });

  it('rejects create order when a supplied amount does not match the subscription price', async () => {
    clientSubscriptionRepo.findOne.mockResolvedValue({
      id: 'sub-1',
      price: 600,
      status: SubscriptionStatus.INACTIVE,
      client: { id: 'client-1' },
      subscription: { id: 'catalog-1' },
    });

    await expect(
      controller.createOrder(
        { id: 'client-1' } as any,
        { subscriptionId: 'sub-1', amount: 500 } as any,
      ),
    ).rejects.toThrow('Provided amount does not match the subscription price');
  });

  it('reconciles a successful callback through queryOrder before activating the subscription', async () => {
    const clientSubscription = {
      id: 'sub-1',
      status: SubscriptionStatus.PENDING,
      client: { id: 'client-1' },
      subscription: { id: 'catalog-1' },
    };
    const payment = {
      id: 'payment-1',
      amount: 600,
      status: PaymentStatus.PENDING,
      providerOrderId: 'ORDER-1',
      providerTransactionId: null,
      providerPayload: null,
      subscription: clientSubscription,
    };

    teleService.parseCallbackInfo.mockReturnValue({ paymentId: 'payment-1' });
    paymentRepo.findOne.mockResolvedValue(payment);
    teleService.queryOrder.mockResolvedValue({
      biz_content: {
        payment_order_id: 'TX-1',
        total_amount: '600.00',
        trans_currency: 'ETB',
        trade_status: 'Completed',
      },
    });
    teleService.getTradeStatus.mockReturnValue('Completed');
    teleService.isSuccessfulTradeStatus.mockReturnValue(true);

    const response = await controller.handleNotification({
      callback_info: 'payment-1',
      merch_order_id: 'ORDER-1',
    });

    expect(response).toEqual({
      message: 'Notification processed',
      tradeStatus: 'Completed',
    });
    expect(payment.status).toBe(PaymentStatus.ACCEPTED);
    expect(payment.providerTransactionId).toBe('TX-1');
    expect(subscriptionService.update).toHaveBeenCalledWith(
      { id: 'client-1' },
      'sub-1',
      { status: SubscriptionStatus.ACTIVE },
    );
  });

  it('marks the payment rejected and resets a pending subscription when Telebirr reports failure', async () => {
    const clientSubscription = {
      id: 'sub-1',
      status: SubscriptionStatus.PENDING,
      client: { id: 'client-1' },
      subscription: { id: 'catalog-1' },
    };
    const payment = {
      id: 'payment-1',
      amount: 600,
      status: PaymentStatus.PENDING,
      providerOrderId: 'ORDER-1',
      subscription: clientSubscription,
    };

    teleService.parseCallbackInfo.mockReturnValue({ paymentId: 'payment-1' });
    paymentRepo.findOne.mockResolvedValue(payment);
    teleService.queryOrder.mockResolvedValue({
      biz_content: {
        total_amount: '600.00',
        trans_currency: 'ETB',
        order_status: 'PAY_FAILED',
      },
    });
    teleService.getTradeStatus.mockReturnValue('PAY_FAILED');
    teleService.isSuccessfulTradeStatus.mockReturnValue(false);
    teleService.isFailedTradeStatus.mockReturnValue(true);

    const response = await controller.handleNotification({
      callback_info: 'payment-1',
      merch_order_id: 'ORDER-1',
    });

    expect(response.tradeStatus).toBe('PAY_FAILED');
    expect(payment.status).toBe(PaymentStatus.REJECTED);
    expect(clientSubscription.status).toBe(SubscriptionStatus.INACTIVE);
    expect(clientSubscriptionRepo.save).toHaveBeenCalledWith(clientSubscription);
    expect(subscriptionService.update).not.toHaveBeenCalled();
  });
});
