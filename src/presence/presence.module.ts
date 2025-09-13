import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { ClientModule } from 'src/client/client.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { PresenceGateway } from './presence.gateway';

@Module({
  imports: [
    JwtModule,
    AuthModule,
    ClientModule,
    TherapistModule,
  ],
  providers: [PresenceGateway],
  exports: [PresenceGateway],
})
export class PresenceModule {}
