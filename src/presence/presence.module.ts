import { forwardRef, Module } from '@nestjs/common';
// import { PresenceGateway } from './presence.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { ClientModule } from 'src/client/client.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

// @Global()
@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => ClientModule),
    forwardRef(() => TherapistModule),
  ],
  providers: [
    PresenceGateway,
    PresenceService
  ],
  exports: [PresenceService],
})
export class PresenceModule {}
