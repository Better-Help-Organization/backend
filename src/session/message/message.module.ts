import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/common/entities/message.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { SessionModule } from '../session.module';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';


@Module({
  imports: [
      TypeOrmModule.forFeature([Message]),
      FirebaseModule,
    forwardRef(() => SessionModule), // 👈 use this if circular
    ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService]
})
export class MessageModule {}
