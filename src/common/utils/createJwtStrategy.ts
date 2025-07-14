import { Injectable, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../constants'; // adjust the path if needed

export function createJwtStrategy(strategyName: string, configKey: string): Type {
  @Injectable()
  class JwtStrategy extends PassportStrategy(Strategy, strategyName) {
    constructor(configService: ConfigService) {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: configService.getOrThrow(configKey),
      });
    }

    async validate(payload: TokenPayload) {
      return payload;
    }
  }

  return JwtStrategy;
}
