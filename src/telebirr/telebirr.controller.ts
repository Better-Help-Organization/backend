import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
  TokenPayload,
} from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { LoggerService } from 'src/logger/logger.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { Repository } from 'typeorm';
import { TelebirrPayDto } from './dto/create-telebirr.dto';
import { TelebirrService } from './telebirr.service';

@Controller('telebirr')
export class TelebirrController {
  constructor(
    private readonly teleService: TelebirrService,
    private readonly subscriptionService: SubscriptionService,
    private readonly logger: LoggerService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(ClientSubscription)
    private readonly clientSubscriptionRepo: Repository<ClientSubscription>,
  ) {}

  @DynamicGuards(new ClientJwtAuthGuard())
  @Post('user-sub')
  async createOrder(@CurrentUser() user: TokenPayload, @Body() dto: TelebirrPayDto) {
    const clientSub = await this.clientSubscriptionRepo.findOne({
      where: {
        id: dto.subscriptionId,
        client: { id: user.id },
      },
      relations: ['client', 'subscription'],
    });

    if (!clientSub) {
      throw new NotFoundException(`Subscription with ID ${dto.subscriptionId} not found for this client`);
    }

    if (dto.amount !== undefined && Number(dto.amount) !== Number(clientSub.price)) {
      throw new BadRequestException('Provided amount does not match the subscription price');
    }

    let savedPayment: Payment | null = null;

    try {
      savedPayment = await this.paymentRepo.save(
        this.paymentRepo.create({
          amount: clientSub.price,
          date: new Date(),
          method: PaymentMethod.TELEBIRR,
          status: PaymentStatus.PENDING,
          subscriptionId: clientSub.id,
        }),
      );

      const orderResult = await this.teleService.createOrder({
        title: dto.title,
        amount: clientSub.price,
        subscriptionId: clientSub.id,
        paymentId: savedPayment.id,
      });

      await this.paymentRepo.update(savedPayment.id, {
        providerOrderId: orderResult.merchOrderId,
        providerPrepayId: orderResult.prepayId,
        providerPayload: {
          ...orderResult.gatewayResponse,
          checkoutUrl: orderResult.checkoutUrl,
          navigationUrl: orderResult.navigationUrl,
        } as Record<string, any>,
        receipt: orderResult.navigationUrl,
      });

      if (clientSub.status !== SubscriptionStatus.ACTIVE) {
        await this.clientSubscriptionRepo.update(clientSub.id, {
          status: SubscriptionStatus.PENDING,
        });
        clientSub.status = SubscriptionStatus.PENDING;
      }

      return orderResult.navigationUrl;
    } catch (error) {
      if (savedPayment?.id) {
        await this.paymentRepo.delete(savedPayment.id).catch(() => null);
      }
      this.logger.error(`Telebirr createOrder failed: ${error?.message ?? error}`);
      throw new BadRequestException('Unable to make Telebirr payment');
    }
  }

  @ApiExcludeEndpoint()
  @Post('verify')
  @Post('verify/:subId')
  async handleNotification(@Body() notification: any, @Param('subId') subId?: string) {
    try {
      const tradeStatus = await this.reconcileNotification(notification, subId);
      return {
        message: 'Notification processed',
        tradeStatus,
      };
    } catch (error) {
      this.logger.error(`Telebirr notification reconcile failed: ${error?.message ?? error}`);
      throw new BadRequestException(`Unable to verify payment ${error?.message ? `: ${error.message}` : ''}`);
    }
  }

  private async reconcileNotification(notification: any, fallbackSubId?: string) {
    const callbackInfo = this.teleService.parseCallbackInfo(notification?.callback_info);

    const payment = await this.resolvePayment(notification, callbackInfo, fallbackSubId);
    if (!payment) {
      throw new NotFoundException('Unable to resolve Telebirr payment record');
    }

    if (
      callbackInfo.subscriptionId &&
      payment.subscription?.id &&
      callbackInfo.subscriptionId !== payment.subscription.id
    ) {
      throw new BadRequestException('Telebirr callback subscription mismatch');
    }

    const merchOrderId = notification?.merch_order_id || payment.providerOrderId;
    if (!merchOrderId) {
      throw new BadRequestException('Telebirr callback did not contain a merchant order id');
    }

    if (payment.providerOrderId && payment.providerOrderId !== merchOrderId) {
      throw new BadRequestException('Telebirr callback merchant order id mismatch');
    }

    const queryResult = await this.teleService.queryOrder(merchOrderId);
    const bizContent = queryResult?.biz_content ?? {};
    const tradeStatus = this.teleService.getTradeStatus(queryResult) || notification?.trade_status || 'UNKNOWN';
    const totalAmount = Number.parseFloat(String(bizContent.total_amount ?? payment.amount ?? '0'));
    const paymentAmount = Number.parseFloat(String(payment.amount ?? '0'));
    const currency = bizContent.trans_currency ?? notification?.trans_currency ?? 'ETB';

    if (Number.isFinite(totalAmount) && Number.isFinite(paymentAmount) && totalAmount !== paymentAmount) {
      throw new BadRequestException('Telebirr amount mismatch during reconciliation');
    }

    if (currency !== 'ETB') {
      throw new BadRequestException('Telebirr currency mismatch during reconciliation');
    }

    payment.providerOrderId = merchOrderId;
    payment.providerTransactionId = bizContent.payment_order_id ?? notification?.payment_order_id ?? payment.providerTransactionId;
    payment.providerPayload = {
      notification,
      queryResult,
    };

    if (this.teleService.isSuccessfulTradeStatus(tradeStatus)) {
      payment.status = PaymentStatus.ACCEPTED;
      await this.paymentRepo.save(payment);

      if (payment.subscription.status !== SubscriptionStatus.ACTIVE) {
        await this.subscriptionService.update(
          { id: payment.subscription.client.id } as TokenPayload,
          payment.subscription.id,
          { status: SubscriptionStatus.ACTIVE },
        );
      }

      return tradeStatus;
    }

    payment.status = this.teleService.isFailedTradeStatus(tradeStatus)
      ? PaymentStatus.REJECTED
      : PaymentStatus.PENDING;
    await this.paymentRepo.save(payment);

    if (
      payment.status === PaymentStatus.REJECTED &&
      payment.subscription.status === SubscriptionStatus.PENDING
    ) {
      payment.subscription.status = SubscriptionStatus.INACTIVE;
      await this.clientSubscriptionRepo.save(payment.subscription);
    }

    return tradeStatus;
  }

  private async resolvePayment(
    notification: any,
    callbackInfo: { paymentId?: string; subscriptionId?: string },
    fallbackSubId?: string,
  ) {
    if (callbackInfo.paymentId) {
      const payment = await this.paymentRepo.findOne({
        where: { id: callbackInfo.paymentId },
        relations: ['subscription', 'subscription.client', 'subscription.subscription'],
      });

      if (payment) {
        return payment;
      }
    }

    if (notification?.merch_order_id) {
      const payment = await this.paymentRepo.findOne({
        where: { providerOrderId: notification.merch_order_id },
        relations: ['subscription', 'subscription.client', 'subscription.subscription'],
      });

      if (payment) {
        return payment;
      }
    }

    const subscriptionId = callbackInfo.subscriptionId || fallbackSubId;
    if (!subscriptionId) {
      return null;
    }

    return this.paymentRepo.findOne({
      where: {
        method: PaymentMethod.TELEBIRR,
        subscription: { id: subscriptionId },
      },
      relations: ['subscription', 'subscription.client', 'subscription.subscription'],
      order: { createdAt: 'DESC' },
    });
  }
}
