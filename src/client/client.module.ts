import { forwardRef, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { Client } from 'src/common/entities/client.entity';
import { DiaryModule } from 'src/diary/diary.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { MatchModule } from 'src/match/match.module';
import { ModalModule } from 'src/modal/modal.module';
import { MoodModule } from 'src/mood/mood.module';
import { SessionModule } from 'src/session/session.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    ChatModule,
    SessionModule,
    ModalModule,
    FirebaseModule,
    DiaryModule,
    forwardRef(() => ChatModule),
    forwardRef(() => SessionModule),
    forwardRef(() => MoodModule),
    forwardRef(() => MatchModule),
  ],  
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService]
})
export class ClientModule {}
