import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/db.module';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './client/client.module';
import { EmailModule } from './email/email.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env`,
        `.env${process.env.NODE_ENV || ''}`, // Load environment-specific variables
      ]
    }),
    DatabaseModule,    
    LoggerModule.forRoot(),
    AuthModule, ClientModule, EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService,    {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
],
})
export class AppModule {}
