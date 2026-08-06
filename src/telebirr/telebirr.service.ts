import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import * as tools from 'src/common/utils/tools';
import { LoggerService } from 'src/logger/logger.service';

type TelebirrOrderInput = {
  title?: string;
  amount: number;
  subscriptionId: string;
  paymentId: string;
};

type TelebirrOrderResult = {
  checkoutUrl: string;
  navigationUrl: string;
  merchOrderId: string;
  prepayId: string;
  gatewayResponse: Record<string, any>;
};

type TelebirrCallbackInfo = {
  paymentId?: string;
  subscriptionId?: string;
};

@Injectable()
export class TelebirrService {
  constructor(
    private readonly logger: LoggerService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(input: TelebirrOrderInput): Promise<TelebirrOrderResult> {
    const fabricToken = (await this.applyFabricToken()).token;
    const reqObject = this.createOrderRequestObject(input);
    const createOrderResult = await this.requestCreateOrder(fabricToken, reqObject);
    const prepayId = createOrderResult?.biz_content?.prepay_id;
    const merchOrderId = createOrderResult?.biz_content?.merch_order_id ?? reqObject.biz_content.merch_order_id;

    if (!prepayId || !merchOrderId) {
      throw new BadGatewayException('Telebirr did not return the required order identifiers');
    }

    const rawRequest = this.createRawRequest(prepayId);

    const checkoutUrl = `${this.configService.get<string>('WEB_BASE_URL')}${rawRequest}&version=1.0&trade_type=Checkout`;

    return {
      checkoutUrl,
      navigationUrl: this.buildNavigationUrl(checkoutUrl),
      merchOrderId,
      prepayId,
      gatewayResponse: createOrderResult,
    };
  }

  async queryOrder(merchOrderId: string): Promise<Record<string, any>> {
    const fabricToken = (await this.applyFabricToken()).token;
    const url = `${this.configService.get<string>('BASE_URL')}/payment/v1/merchant/queryOrder`;
    const reqObject = this.createQueryOrderRequestObject(merchOrderId);
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-Key': this.configService.get<string>('FABRIC_APP_ID'),
      Authorization: fabricToken,
    };

    try {
      const response = await lastValueFrom(this.httpService.post(url, reqObject, { headers }));
      if (!response?.data) {
        throw new BadGatewayException('Empty response from Telebirr queryOrder');
      }
      return response.data;
    } catch (error) {
      this.logGatewayError('Telebirr queryOrder failed', error);
      throw new BadGatewayException('Failed to query Telebirr order status');
    }
  }

  parseCallbackInfo(value: unknown): TelebirrCallbackInfo {
    if (typeof value !== 'string' || !value.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return { paymentId: value };
    }
  }

  getTradeStatus(payload: Record<string, any> | null | undefined): string | null {
    if (!payload) return null;
    return payload?.biz_content?.trade_status ?? payload?.biz_content?.order_status ?? payload?.trade_status ?? null;
  }

  isSuccessfulTradeStatus(status: string | null | undefined): boolean {
    return status === 'Completed' || status === 'PAY_SUCCESS';
  }

  isFailedTradeStatus(status: string | null | undefined): boolean {
    return ['Failure', 'Expired', 'PAY_FAILED', 'ORDER_CLOSED', 'REFUND_FAILED'].includes(status ?? '');
  }

  isPendingTradeStatus(status: string | null | undefined): boolean {
    return ['Pending', 'Paying', 'PAYING', 'WAIT_PAY'].includes(status ?? '');
  }

  private async applyFabricToken(): Promise<{ token: string }> {
    const url = `${this.configService.get<string>('BASE_URL')}/payment/v1/token`;
    const body = { appSecret: this.configService.getOrThrow<string>('APP_SECRET') };
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-Key': this.configService.get<string>('FABRIC_APP_ID'),
    };

    try {
      const response = await lastValueFrom(this.httpService.post(url, body, { headers }));
      if (!response?.data?.token) {
        throw new BadGatewayException('Telebirr did not return a fabric token');
      }
      return response.data;
    } catch (error) {
      this.logGatewayError('Telebirr fabric token request failed', error);
      throw new InternalServerErrorException('Failed to apply fabric token');
    }
  }

  private async requestCreateOrder(
    fabricToken: string,
    reqObject: Record<string, any>,
  ): Promise<Record<string, any>> {
    const url = `${this.configService.get<string>('BASE_URL')}/payment/v1/merchant/preOrder`;
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-Key': this.configService.get<string>('FABRIC_APP_ID'),
      Authorization: fabricToken,
    };

    try {
      const response = await lastValueFrom(this.httpService.post(url, reqObject, { headers }));
      if (!response?.data) {
        throw new BadGatewayException('Empty response from Telebirr createOrder');
      }
      return response.data;
    } catch (error) {
      this.logGatewayError('Telebirr createOrder failed', error);
      throw new BadGatewayException('Failed to create Telebirr order');
    }
  }

  private createOrderRequestObject(input: TelebirrOrderInput): Record<string, any> {
    const merchOrderId = this.createMerchantOrderId();
    const req: Record<string, any> = {
      timestamp: tools.createTimeStamp().toString(),
      nonce_str: tools.createNonceStr(),
      method: 'payment.preorder',
      version: '1.0',
    };

    req.biz_content = {
      notify_url: this.getNotifyUrl(),
      appid: this.configService.get<string>('MERCHANT_APP_ID'),
      merch_code: this.configService.get<string>('MERCHANT_CODE'),
      merch_order_id: merchOrderId,
      trade_type: 'Checkout',
      title: input.title || 'Subscription payment',
      total_amount: input.amount.toFixed(2),
      trans_currency: 'ETB',
      timeout_express: '120m',
      business_type: 'BuyGoods',
      payee_identifier: this.configService.get<string>('MERCHANT_CODE'),
      payee_identifier_type: '04',
      payee_type: '5000',
      redirect_url: this.getRedirectUrl(),
      // Telebirr sandbox rejects callback_info values longer than 64 chars.
      callback_info: input.paymentId,
    };

    req.sign = tools.signRequestObject(req, this.configService.get<string>('PRIVATE_KEY'));
    req.sign_type = 'SHA256WithRSA';
    return req;
  }

  private createQueryOrderRequestObject(merchOrderId: string): Record<string, any> {
    const req: Record<string, any> = {
      timestamp: tools.createTimeStamp().toString(),
      nonce_str: tools.createNonceStr(),
      method: 'payment.queryorder',
      version: '1.0',
    };

    req.biz_content = {
      appid: this.configService.get<string>('MERCHANT_APP_ID'),
      merch_code: this.configService.get<string>('MERCHANT_CODE'),
      merch_order_id: merchOrderId,
    };

    req.sign = tools.signRequestObject(req, this.configService.get<string>('PRIVATE_KEY'));
    req.sign_type = 'SHA256WithRSA';
    return req;
  }

  private createMerchantOrderId(): string {
    return `${Date.now()}${tools.createNonceStr().slice(0, 8)}`;
  }

  private createRawRequest(prepayId: string): string {
    const map = {
      appid: this.configService.get<string>('MERCHANT_APP_ID'),
      merch_code: this.configService.get<string>('MERCHANT_CODE'),
      nonce_str: tools.createNonceStr(),
      prepay_id: prepayId,
      timestamp: tools.createTimeStamp(),
    };

    const sign = tools.signRequestObject(map, this.configService.get<string>('PRIVATE_KEY'));

    return Object.entries(map)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .concat([
        `sign=${encodeURIComponent(sign)}`,
        `sign_type=${encodeURIComponent('SHA256WithRSA')}`,
      ])
      .join('&');
  }

  private buildNavigationUrl(checkoutUrl: string): string {
    const wrapperUrl =
      this.configService.get<string>('TELEBIRR_NAVIGATION_URL') ||
      `${this.getPublicBaseUrl()}/public/index.html`;
    const separator = wrapperUrl.includes('?') ? '&' : '?';

    return `${wrapperUrl}${separator}url=${encodeURIComponent(checkoutUrl)}`;
  }

  private getNotifyUrl(): string {
    return `${this.getPublicBaseUrl()}/api/v1/telebirr/verify`;
  }

  private getRedirectUrl(): string {
    return this.configService.get<string>('TELEBIRR_REDIRECT_URL') || this.getPublicBaseUrl();
  }

  private getPublicBaseUrl(): string {
    const explicitBaseUrl =
      this.configService.get<string>('TELEBIRR_PUBLIC_BASE_URL') ||
      this.configService.get<string>('PUBLIC_API_BASE_URL');

    if (explicitBaseUrl) {
      return explicitBaseUrl.replace(/\/$/, '');
    }

    const hostRule = this.configService.get<string>('HOST') || '';
    const pathPrefixMatch = hostRule.match(/PathPrefix\(`([^`]+)`\)/);
    const pathPrefix = pathPrefixMatch?.[1] ?? '';

    return `https://app.navithera.com${pathPrefix}`.replace(/\/$/, '');
  }

  private logGatewayError(message: string, error: any) {
    const gatewayPayload = error?.response?.data;
    if (gatewayPayload) {
      this.logger.error(`${message}: ${JSON.stringify(gatewayPayload)}`);
      return;
    }

    this.logger.error(`${message}: ${error?.message ?? error}`);
  }
}
