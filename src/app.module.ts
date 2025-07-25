import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './client/client.module';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';
import { DatabaseModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { FirebaseModule } from './firebase/firebase.module';
import { LoggerModule } from './logger/logger.module';
import { SessionModule } from './session/session.module';
import { TherapistModule } from './therapist/therapist.module';


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
    AuthModule, ClientModule, TherapistModule, EmailModule, SessionModule, FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService,    {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
],
})
export class AppModule {}
