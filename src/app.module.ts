import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AnswerModule } from './answer/answer.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BankModule } from './bank/bank.module';
import { ChatModule } from './chat/chat.module';
import { ClientModule } from './client/client.module';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';
import { DatabaseModule } from './db/db.module';
import { DiaryModule } from './diary/diary.module';
import { EmailModule } from './email/email.module';
import { FirebaseModule } from './firebase/firebase.module';
import { LanguageModule } from './language/language.module';
import { LevelModule } from './level/level.module';
import { LicenseModule } from './license/license.module';
import { LoggerModule } from './logger/logger.module';
import { MatchModule } from './match/match.module';
import { ModalModule } from './modal/modal.module';
import { MoodModule } from './mood/mood.module';
import { NotificationModule } from './notification/notification.module';
import { OptionModule } from './option/option.module';
import { ParameterModule } from './parameter/parameter.module';
import { PaymentModule } from './payment/payment.module';
import { PreferenceModule } from './preference/preference.module';
import { PresenceModule } from './presence/presence.module';
import { QuestionModule } from './question/question.module';
import { QuoteModule } from './quote/quote.module';
import { RatingModule } from './rating/rating.module';
import { SessionModule } from './session/session.module';
import { SubscriptionModule } from './subscription/subscription.module';
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
    JwtModule.register({
        global: true,   // make JwtService available app-wide
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,    
    LoggerModule.forRoot(),
    AuthModule, ClientModule, TherapistModule, 
    EmailModule, PreferenceModule, ModalModule, 
    QuestionModule, OptionModule, AnswerModule, 
    LanguageModule, LevelModule,
    SessionModule, FirebaseModule,  RatingModule, LicenseModule, AvailabilityModule,
    ChatModule,
    MatchModule,
    PresenceModule,
    MoodModule,
    DiaryModule,
    QuoteModule,
    SubscriptionModule,
    ParameterModule,
    PaymentModule,
    BankModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService,    
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
],
})
export class AppModule {}
