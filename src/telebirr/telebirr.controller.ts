import { BadRequestException, Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { PaymentMethod, SubscriptionStatus, TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
// import { DepositService } from 'src/deposit/deposit.service';
// import { TransactionService } from 'src/transaction/transaction.service';
import { TelebirrService } from './telebirr.service';

import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { Repository } from 'typeorm';
import { TelebirrPayDto } from './dto/create-telebirr.dto';


@Controller('telebirr')
export class TelebirrController {

  constructor(
    private readonly teleService: TelebirrService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(ClientSubscription)
    private readonly clientSubscriptionRepo: Repository<ClientSubscription>,
    
  ) {}

  @DynamicGuards(
    new ClientJwtAuthGuard()
  )
  @Post('user-sub')
  async createOrder(
    @CurrentUser() user:TokenPayload,
    @Body() dto: TelebirrPayDto, 
  ) {
    try {
      this.teleService.userId = user.id
      this.teleService.userKind = user.type
      this.teleService.subId = dto.subscriptionId
      const clientSub = await this.clientSubscriptionRepo.findOne({
        where: {
          id: dto.subscriptionId,
          client: { id: user.id },
        },
        relations: ['client', 'subscription', 'payment'],
      });
      console.log({clientSub})
      if (!clientSub) {
        throw new NotFoundException(`Subscription with ID ${dto.subscriptionId} not found for this client`);
      }
  
      let savedPayment: Payment | null = null;
      try {
        const payment = this.paymentRepo.create({
          amount: clientSub.price,
          date: new Date(),
          method: PaymentMethod.TELEBIRR,
          subscription: clientSub,
        });
  
        savedPayment = await this.paymentRepo.save(payment);
      return  await this.teleService.createOrder({title:dto.title, amount: clientSub.price});
      
    } catch (error) {
      clientSub.status = SubscriptionStatus.PENDING
      const cs = await this.clientSubscriptionRepo.save(clientSub)
      // cleanup partially saved payment
      if (savedPayment && savedPayment.id) {
        await this.paymentRepo.delete(savedPayment.id).catch(() => null);
      }
      throw new BadRequestException('Unable to make payment')
    }
    } catch (error) {
      throw error;
    }
  }

  @ApiExcludeEndpoint()
  @Post('verify/:subId')
  async handleNotification(
    @Body() notification: any,
    @Param('subId') subId: string
  ) {
    try {
      console.log('Received Telebirr notification: - telebirr.controller.ts:88', notification);
      console.log('Verifying payment for subscription ID: - telebirr.controller.ts:89', subId);
      this.clientSubscriptionRepo.update(subId, {status:SubscriptionStatus.ACTIVE})
      return 'Notification processed';
    } catch (error) {
      throw new BadRequestException('Unable to verify payment '+error?.message);
    }
  }
}

// Process the notification (implement logic here)
// Example of Received notification: {
  // notify_url: 'http://195.201.134.129/test/api/v1/payment/telebirr/verify',
  // appid: '1346841673881608',
  // notify_time: '1747807682482',
  // merch_code: '957627',
  // merch_order_id: '1747807728673',
  // payment_order_id: '017011075L09075800001005',
  // total_amount: '500.00',
  // trans_currency: 'ETB',
  // trade_status: 'Completed',
  // trans_end_time: '1747807682000',
  // callback_info: 'From web',
  // sign: 'gCR3Z74jMV+Yqm/Tjx+kB9A8IHyfhL/fOtt+Dn2szPreN/V2X1LZuuxXQFb1twwTDPGQp0yRL4kt0Qr8kwLchctAAMzHSyngptk9kmugQE0inTITKoMnW/r+sdtyVihLiCB3XaPJHo/OgYP8Ri6m4qLqXp7Z37UssLxhkOEDyI++EsiqrS0qvSRY2emyPmQCCmVsWjuRnKlYZh685MPq5m5m7U9RQxq5lg1Le1YOVcYnKFwqikooFC6q2ddN+j4/CgT+WzKWua6JT6xB/1JBG8gonbF1CfL7l3PE7SWrDXYnkql99eHMQFBs0uZg1BSxcHsRRTYMEjU7iFtQX6kLw42acopgzTUiu5raYLSHfdq+FdIpinBu1KdaU+VzffNoBy8nbkazoTdE8l4G6FjAi4PpJocYW5ygzulVL3HSzai3X5E0QUkSJu+SSp9lg/ua5EzfVW2hU/wzROatpaYqpQ6IdNC7pTg8JtMb96dcf+yiGFABAoZywqQNz0opjrKZ',
  // sign_type: 'SHA256WithRSA',
  // transId: 'CEL40PCHH8'
// }

