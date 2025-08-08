import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AnswerModule } from './answer/answer.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ClientModule } from './client/client.module';
import { LoggingInterceptor } from './common/interceptors/logger.interceptor';
import { DatabaseModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { FirebaseModule } from './firebase/firebase.module';
import { LanguageModule } from './language/language.module';
import { LevelModule } from './level/level.module';
import { LoggerModule } from './logger/logger.module';
import { ModalModule } from './modal/modal.module';
import { OptionModule } from './option/option.module';
import { PreferenceModule } from './preference/preference.module';
import { QuestionModule } from './question/question.module';
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
    AuthModule, ClientModule, TherapistModule, 
    EmailModule, PreferenceModule, ModalModule, 
    QuestionModule, OptionModule, AnswerModule, 
    LanguageModule, LevelModule,
    SessionModule, FirebaseModule, 
    ChatModule,
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
