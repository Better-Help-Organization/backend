import { Module } from '@nestjs/common';
import { PresenceGateway } from './presence.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ClientModule } from 'src/client/client.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { AuthModule } from 'src/auth/auth.module';

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
