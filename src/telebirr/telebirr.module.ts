import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as https from 'https';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Payment } from 'src/common/entities/payment.entity';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TelebirrController } from './telebirr.controller';
import { TelebirrService } from './telebirr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, ClientSubscription]),
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const allowInsecureTls = ['1', 'true', 'yes', 'on'].includes(
          (configService.get<string>('TELEBIRR_ALLOW_INSECURE_TLS') || '').trim().toLowerCase(),
        );

        return {
          timeout: 15000,
          ...(allowInsecureTls
            ? {
                // Sandbox-only workaround for Telebirr's broken TLS chain.
                httpsAgent: new https.Agent({
                  rejectUnauthorized: false,
                }),
              }
            : {}),
        };
      },
    }),
    SubscriptionModule,
  ],
  controllers: [TelebirrController],
  providers: [TelebirrService],
})
export class TelebirrModule {}
