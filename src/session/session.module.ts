import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { Availability } from 'src/common/entities/availability.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Session } from 'src/common/entities/session.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { MessageModule } from './message/message.module';
import { NotesModule } from './note/note.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Client, ClientSubscription, Availability]),
    NotesModule, 
    MessageModule, 
    StatusModule,
    FirebaseModule,
    forwardRef(() => ClientModule),
    forwardRef(() => TherapistModule)
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}
