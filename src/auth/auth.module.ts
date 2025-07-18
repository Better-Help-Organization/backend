import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtModule } from '@nestjs/jwt';

import * as jwtRereshStrategies from 'src/common/strategy/jwt-refresh.strategy';
import * as jwtStrategies from 'src/common/strategy/jwt.strategy';
import {AdminJwtStrategy, ClientJwtStrategy, TherapistJwtStrategy} from 'src/common/strategy/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { ClientModule } from 'src/client/client.module';
import { AdminModule } from 'src/admin/admin.module';
import { EmailPwdStrategy, EmailStrategy } from 'src/common/strategy/email.strategy';
import { EmailModule } from 'src/email/email.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';
import { TherapistModule } from 'src/therapist/therapist.module';
import { Therapist } from 'src/common/entities/therapist.entity';
import { Admin } from 'src/common/entities/admin.entity';
import { GoogleStrategy } from 'src/common/strategy/google.strategy';

@Module({
  imports: [
    JwtModule
    ,PassportModule
    ,ClientModule
    ,TherapistModule
    ,AdminModule
    ,EmailModule
    ,TypeOrmModule.forFeature([Admin, Client, Therapist])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailStrategy,
    EmailPwdStrategy,
    AdminJwtStrategy, ClientJwtStrategy, TherapistJwtStrategy,
    GoogleStrategy,
    ...Object.values(jwtStrategies),
    ...Object.values(jwtRereshStrategies), 
  ],
  exports: [AuthService]
})
export class AuthModule {}
