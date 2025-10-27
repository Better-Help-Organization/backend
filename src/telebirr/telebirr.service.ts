import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserTypes } from 'src/common/constants/index';


import { lastValueFrom } from 'rxjs';
import * as tools from 'src/common/utils/tools';
import { LoggerService } from 'src/logger/logger.service';


@Injectable()
export class TelebirrService {

    userId: string
    userKind: UserTypes
    subId: string

    constructor(        
      private logger: LoggerService,
      private readonly httpService: HttpService,
      private readonly configService: ConfigService,
    ){}


  async createOrder(reqBody: { title: string; amount: number }): Promise<string> {
    try {
        const { title, amount } = reqBody;
        const fabricTokenResult = await this.applyFabricToken();
        const fabricToken = fabricTokenResult.token;
        const createOrderResult = await this.requestCreateOrder(
          fabricToken,
          title,
          amount,
        );
        console.log({createOrderResult})
        const prepayId = createOrderResult.biz_content?.prepay_id;
        if (!prepayId) {
          throw new HttpException(
            'Failed to get prepayId from createOrder response',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        console.log({prepayId})
        const rawRequest = this.createRawRequest(prepayId);
        console.log({rawRequest})
        return `${this.configService.get<string>(
          'WEB_BASE_URL',
        )}${rawRequest}&version=1.0&trade_type=Checkout`;
        
      } catch (error) {
        this.logger.log(error)
        throw error
      }
  }

  private async applyFabricToken(): Promise<{ token: string }> {
    const url = `${this.configService.get<string>('BASE_URL')}/payment/v1/token`;
    const body = { appSecret: this.configService.getOrThrow<string>('APP_SECRET') };
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-Key': this.configService.get<string>('FABRIC_APP_ID'),
    };
    
    try {
      const response = await lastValueFrom(
        this.httpService.post(url, body, { headers }),
      );
      return response.data;
    } catch (error) {
      this.logger.log(error)
    
      throw new HttpException(
        'Failed to apply fabric token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async requestCreateOrder(
    fabricToken: string,
    title: string,
    amount: number,
  ): Promise<any> {
    const url = `${this.configService.get<string>('BASE_URL')}/payment/v1/merchant/preOrder`;
    const reqObject = this.createRequestObject(title, amount);
    const headers = {
      'Content-Type': 'application/json',
      'X-APP-Key': this.configService.get<string>('FABRIC_APP_ID'),
      Authorization: fabricToken,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, reqObject, { headers }),
      );
      if (!response?.data) {
        this.logger.error('Empty response received.');
        throw new HttpException('Empty response from payment gateway', HttpStatus.BAD_GATEWAY);
      }
      return response.data;
    } catch (error) {
      console.log({err:error.response.data})
      this.logger.log(error)
    throw new HttpException(
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createRequestObject(title:string, amount:number) {
    let req = {
      timestamp: tools.createTimeStamp().toString(),
      nonce_str: tools.createNonceStr(),
      method: "payment.preorder",
      version: "1.0",
    };
    const env = process.env.NODE_ENV
    let biz = {
      notify_url: `http://195.201.134.129/${env}/api/v1/payment/telebirr/verify/${this.subId}`,
      appid: this.configService.get<string>('MERCHANT_APP_ID'),
      merch_code: this.configService.get<string>('MERCHANT_CODE'),
      merch_order_id:this.createMerchantOrderId(),
      trade_type: "Checkout",
      title: title,
      total_amount: amount.toString(),
      trans_currency: "ETB",
      timeout_express: "120m",
      business_type: "BuyGoods",
      payee_identifier: this.configService.get<string>('MERCHANT_CODE'),
      payee_identifier_type: "04",
      payee_type: "5000",
      redirect_url: "https://ethiodelivery.com/",
      callback_info: "From web",
    };
    req['biz_content'] = biz;
    req['sign'] = tools.signRequestObject(req, this.configService.get<string>('PRIVATE_KEY'));
    req['sign_type'] = "SHA256WithRSA";
    return req;
  }

  private createMerchantOrderId(): string {
    return new Date().getTime().toString();
  }

  private createRawRequest(prepayId: string): string {
    try {
          const map = {
            appid: this.configService.get<string>('MERCHANT_APP_ID'),
            merch_code: this.configService.get<string>('MERCHANT_CODE'),
            nonce_str: tools.createNonceStr(),
            prepay_id: prepayId,
            timestamp: tools.createTimeStamp(),
          };
          
          const sign = tools.signRequestObject(
            map,
            this.configService.get<string>('PRIVATE_KEY'),
          );
          
          return Object.keys(map)
            .map((key) => `${key}=${map[key]}`)
            .concat([`sign=${sign}`, 'sign_type=SHA256WithRSA'])
            .join('&');

      } catch (error) {

        this.logger.log(error)
        throw error
      }
    } 
  }