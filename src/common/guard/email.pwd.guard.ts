import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class EmailPwdAuthGuard extends AuthGuard('email-pwd') {}

@Injectable()
export class PhonePwdAuthGuard extends AuthGuard('phone-pwd') {}