import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { JwtModule } from '@nestjs/jwt';


import * as jwtRereshStrategies from 'src/common/strategy/jwt-refresh.strategy';
import * as jwtStrategies from 'src/common/strategy/jwt.strategy';
import {AdminJwtStrategy, ClientJwtStrategy} from 'src/common/strategy/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { ClientModule } from 'src/client/client.module';
import { AdminModule } from 'src/admin/admin.module';
import { EmailPwdStrategy, EmailStrategy } from 'src/common/strategy/email.strategy';
import { EmailModule } from 'src/email/email.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';


@Module({
  imports: [
    JwtModule
    ,PassportModule
    ,ClientModule
    ,AdminModule
    ,AuthModule
    ,EmailModule
    ,TypeOrmModule.forFeature([Client])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailStrategy,
    EmailPwdStrategy,
    AdminJwtStrategy, ClientJwtStrategy,
    ...Object.values(jwtStrategies),
    ...Object.values(jwtRereshStrategies), 
  ],
  exports: [AuthService]
})
export class AuthModule {}
