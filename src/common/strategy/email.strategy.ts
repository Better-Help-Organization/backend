import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from 'src/auth/auth.service';
import { UserTypes } from '../constants';
// import { AuthService } from '../../auth/auth.service';

@Injectable()
export class EmailStrategy extends PassportStrategy(Strategy, 'email') {
  constructor(
    private readonly authService: AuthService
  ) {
    super({
      usernameField: 'email',
      passwordField: 'otp',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, otp: string) {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      throw new BadRequestException('Firebase token is required.');
    }

    // Determine user type based on request path
    const path = req.path.toLowerCase();
    let userType: UserTypes;

    if (path.includes('client')) {
      userType = UserTypes.CLIENT;
    } else if (path.includes('therapist')) {
      userType = UserTypes.THERAPIST;
    } else if (path.includes('admin')) {
      userType = UserTypes.ADMIN;
    } else {
      throw new BadRequestException('Invalid verification path');
    }

    const user = await this.authService.verifyByEmail(email, otp, userType);

    if (!user) {
      throw new UnauthorizedException(`Invalid credentials for ${userType}`);
    }

    return user;
  }
}

@Injectable()
export class EmailPwdStrategy extends PassportStrategy(Strategy, 'email-pwd') {
  constructor(
    private readonly authService: AuthService
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string) {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      throw new BadRequestException('Firebase token is required.');
    }

    // Determine user type based on request path
    const path = req.path.toLowerCase();
    let userType: UserTypes;

    if (path.includes('client')) {
      userType = UserTypes.CLIENT;
    } else if (path.includes('therapist')) {
      userType = UserTypes.THERAPIST;
    } else if (path.includes('admin')) {
      userType = UserTypes.ADMIN;
    } else {
      throw new BadRequestException('Invalid login path');
    }

    const user = await this.authService.loginUser(email, password, firebaseToken, userType);

    if (!user) {
      throw new UnauthorizedException(`Invalid credentials for ${userType}`);
    }

    return user;
  }
}
