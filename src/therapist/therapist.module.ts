import { forwardRef, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { License } from 'src/common/entities/license.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ModalModule } from 'src/modal/modal.module';
import { PresenceGateway } from 'src/presence/presence.gateway';
import { SessionModule } from 'src/session/session.module';
import { TherapistController } from './therapist.controller';
import { TherapistService } from './therapist.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Therapist, 
      License
    ]),
    forwardRef(() => ChatModule),
    ModalModule,
    LoggerModule,
    SessionModule,
    FirebaseModule,
    PresenceGateway
  ],  
  controllers: [TherapistController],
  providers: [TherapistService],
  exports: [TherapistService],
})
export class TherapistModule {}
