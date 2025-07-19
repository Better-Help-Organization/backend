import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy, Profile } from 'passport-google-oauth20';
import { getAppUrl } from "src/common/utils/getAppUrl";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: 'GOOGLE_WEB_CLIENT_ID',
      clientSecret: 'GOOGLE_WEB_CLIENT_SECRET',
      callbackURL: 'GOOGLE_CALLBACK_URL',
      scope: ['email', 'profile'],
    });
  }

  
  authenticate(req: Request, options?: any): void {
    // const clientType = req.query.client as string || req.headers['x-client-type'] as string;
    const state = req.query.state as string;
    const query = req.query.client as string
    const clientType = state?.split('_')[2] ?? query // 'mobile' or 'web'

    let clientID: string;
    let clientSecret: string;
    let callbackURL = `${getAppUrl(req)}/api/v1/auth/google/callback`;

    if (clientType === 'mobile') {
      clientID = this.configService.getOrThrow('GOOGLE_MOBILE_CLIENT_ID');
      clientSecret = this.configService.getOrThrow('GOOGLE_MOBILE_CLIENT_SECRET');
    }
    else if (clientType === 'web') {
      clientID = this.configService.getOrThrow('GOOGLE_WEB_CLIENT_ID');
      clientSecret = this.configService.getOrThrow('GOOGLE_WEB_CLIENT_SECRET');
    }
    else throw new UnauthorizedException("Unknown client making the request") 

    // Override options with dynamic credentials
    options = {
      ...options,
      callbackURL,
    };

    (this as any)._oauth2._clientId = clientID;
    (this as any)._oauth2._clientSecret = clientSecret;

  super.authenticate(req, options);
}


  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
    const { emails, displayName } = profile;
    const email = emails[0].value;

    return {
      email,
      firstName: displayName.split(' ')[0],
      lastName: displayName.split(' ').slice(1).join(' ') || '',
      accessToken,
    };
  }
}