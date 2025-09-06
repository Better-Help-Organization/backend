import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { Chat } from 'src/common/entities/chat.entity';
import { Message } from 'src/common/entities/message.entity';
import { Notification } from 'src/common/entities/notification.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([Chat, Message, Notification]),
    forwardRef(() => ClientModule),
    forwardRef(() => TherapistModule),
    FirebaseModule
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
