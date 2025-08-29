import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { Client } from 'src/common/entities/client.entity';
import { ModalModule } from 'src/modal/modal.module';
import { SessionModule } from 'src/session/session.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    ChatModule,
    SessionModule,
    ModalModule,
    // forwardRef(()=>MoodModule)
  ],  
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
