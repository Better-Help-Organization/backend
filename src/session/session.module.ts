import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { MessageModule } from './message/message.module';
import { NotesModule } from './note/note.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Subscription]),
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
