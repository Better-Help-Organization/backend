import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from 'src/auth/auth.service';
import { UserTypes } from '../constants';
// import { AuthService } from '../../auth/auth.service';

@Injectable()
export class EmailStrategy extends PassportStrategy(Strategy,'email') {
  constructor(
    private readonly authService: AuthService
  ) {
    super({
      usernameField: 'email',
      passwordField: 'otp',
      passReqToCallback: true, // Enable passing request to the validate method
    });
  }

  async validate(req: any, email: string, otp: string) {

    const { firebaseToken } = req.body;
    // Check if firebaseToken exists
    if (!firebaseToken) {
      throw new BadRequestException('Firebase token is required.');
    }
    
    const admin = await this.authService.verifyByEmail(email, otp, UserTypes.ADMIN)
    
    if (!admin) throw new UnauthorizedException('Invalid email or OTP');
    else return admin;    

  }
}

@Injectable()
export class EmailPwdStrategy extends PassportStrategy(Strategy,'email-pwd') {
  constructor(
    private readonly authService: AuthService
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true, // Enable passing request to the validate method
    });
  }

  async validate(req: any, email: string, password: string) {

    const { firebaseToken } = req.body;
    // Check if firebaseToken exists
    if (!firebaseToken) {
      throw new BadRequestException('Firebase token is required.');
    }

    const admin = await this.authService.loginAdmin(email, password, firebaseToken)
    
    if (!admin) throw new UnauthorizedException('Invalid email or OTP');
    else return admin;    

  }
}