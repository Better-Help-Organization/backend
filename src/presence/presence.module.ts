import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { ClientModule } from 'src/client/client.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { PresenceGateway } from './presence.gateway';

@Module({
  imports: [
    JwtModule,
    forwardRef(()=>(AuthModule)),
    forwardRef(()=>(ClientModule)),
    forwardRef(()=>(TherapistModule)),
  ],
  providers: [PresenceGateway],
  exports: [PresenceGateway],
})
export class PresenceModule {}
