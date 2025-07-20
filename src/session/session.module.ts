import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { NotesModule } from './note/.module';
import { MessageModule } from './message/.module';
import { StatusModule } from './status/.module';

@Module({
  controllers: [SessionController],
  providers: [SessionService],
  imports: [SessionModule, NotesModule, MessageModule, StatusModule],
})
export class SessionModule {}
