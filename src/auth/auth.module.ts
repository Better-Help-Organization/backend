import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';


import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from 'src/admin/admin.module';
import { ClientModule } from 'src/client/client.module';
import { Admin } from 'src/common/entities/admin.entity';
import { Client } from 'src/common/entities/client.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { EmailPwdStrategy, EmailStrategy, PhonePwdStrategy } from 'src/common/strategy/email.strategy';
import { GoogleStrategy } from 'src/common/strategy/google.strategy';
import * as jwtRereshStrategies from 'src/common/strategy/jwt-refresh.strategy';
import * as jwtStrategies from 'src/common/strategy/jwt.strategy';
import { AdminJwtStrategy, ClientJwtStrategy, TherapistJwtStrategy } from 'src/common/strategy/jwt.strategy';
import { EmailModule } from 'src/email/email.module';
import { TherapistModule } from 'src/therapist/therapist.module';

@Module({
  imports: [
    PassportModule
    ,forwardRef(() =>ClientModule)
    ,forwardRef(() =>TherapistModule)
    ,forwardRef(() =>AdminModule)
    ,EmailModule
    ,TypeOrmModule.forFeature([Admin, Client, Therapist])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailStrategy,
    EmailPwdStrategy,
    PhonePwdStrategy,
    AdminJwtStrategy, ClientJwtStrategy, TherapistJwtStrategy,
    GoogleStrategy,
    ...Object.values(jwtStrategies),
    ...Object.values(jwtRereshStrategies), 
  ],
  exports: [AuthService]
})
export class AuthModule {}
