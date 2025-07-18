import {
  Controller, Get, Post, Body, Patch, Param, Delete, HttpCode,
  UseGuards, Res, NotFoundException,
  Req
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import {
  AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard
} from 'src/common/guard/jwt-auth.guard';
import {
  ClientJwtRefreshAuthGuard, AdminJwtRefreshAuthGuard, TherapistJwtRefreshAuthGuard
} from 'src/common/guard/jwt-refresh.guard';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { LoggerService } from 'src/logger/logger.service';
import { EmailDto } from './dto/EmailDto';
import { EmailAuthGuard } from 'src/common/guard/email.guard';
import { LoginDto } from './dto/LoginDto';
import { ResetPwdDto } from './dto/ResetPwdDto';
import { EmailVerifyDto } from './dto/VerifyOtpDto';
import { EmailPwdAuthGuard } from 'src/common/guard/email.pwd.guard';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { TherapistSignupDto } from './dto/therapist-signup.dto';
import { ClientSignupDto } from './dto/ client-signup.dto';
import { Admin } from 'src/common/entities/admin.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { Client } from 'src/common/entities/client.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import passport from 'passport';
import { oAuthDto } from './dto/oauth.dto';

class FirebaseTokenDto {
  @ApiProperty()
  @IsString()
  firebaseToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: LoggerService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @HttpCode(200)
  @Post('otp/client')
  async clientOTP(@Body() { email }: EmailDto) {
    return this.sendOtpForUserType(UserTypes.CLIENT, email, 'Client not found');
  }

  @HttpCode(200)
  @Post('otp/therapist')
  async therapistOTP(@Body() { email }: EmailDto) {
    return this.sendOtpForUserType(UserTypes.THERAPIST, email, 'Therapist not found');
  }

  @HttpCode(200)
  @Post('otp/admin')
  async adminOTP(@Body() { email }: EmailDto) {
    return this.sendOtpForUserType(UserTypes.ADMIN, email, 'Admin not found');
  }

  @HttpCode(200)
  @Post('signup/client')
  async clientSignup(@Body() dto: ClientSignupDto) {
    return this.signupUser(UserTypes.CLIENT, dto);
  }

  @HttpCode(200)
  @Post('signup/therapist')
  async therapistSignup(@Body() dto: TherapistSignupDto) {
    return this.signupUser(UserTypes.THERAPIST, dto);
  }

  @HttpCode(200)
  @Post('signup/admin')
  async adminSignup(@Body() dto: AdminSignupDto) {
    return this.signupUser(UserTypes.ADMIN, dto);
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/client')
  async clientVerify(@CurrentUser() client: Client, @Body() _: EmailVerifyDto) {
    return client;
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/therapist')
  async therapistVerify(@CurrentUser() therapist: Therapist, @Body() _: EmailVerifyDto) {
    return therapist;
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/admin')
  async adminVerify(@CurrentUser() admin: Admin, @Body() _: EmailVerifyDto) {
    return admin;
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/client')
  async clientLogin(@CurrentUser() client: Client, @Body() _: LoginDto) {
    return client;
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/therapist')
  async therapistLogin(@CurrentUser() therapist: Therapist, @Body() _: LoginDto) {
    return therapist;
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/admin')
  async adminLogin(@CurrentUser() admin: Admin, @Body() _: LoginDto) {
    return admin;
  }

  @HttpCode(200)
  @Post('resetPwd/client')
  async clientResetPwd(@Body() dto: ResetPwdDto) {
    return this.resetPassword(UserTypes.CLIENT, dto);
  }

  @HttpCode(200)
  @Post('resetPwd/therapist')
  async therapistResetPwd(@Body() dto: ResetPwdDto) {
    return this.resetPassword(UserTypes.THERAPIST, dto);
  }

  @HttpCode(200)
  @Post('resetPwd/admin')
  async adminResetPwd(@Body() dto: ResetPwdDto) {
    return this.resetPassword(UserTypes.ADMIN, dto);
  }

  @HttpCode(200)
  @Post('forgotPwd/client')
  async clientForgotPwd(@Body() { email }: EmailDto) {
    return this.forgotPassword(UserTypes.CLIENT, email);
  }

  @HttpCode(200)
  @Post('forgotPwd/therapist')
  async therapistForgotPwd(@Body() { email }: EmailDto) {
    return this.forgotPassword(UserTypes.THERAPIST, email);
  }

  @HttpCode(200)
  @Post('forgotPwd/admin')
  async adminForgotPwd(@Body() { email }: EmailDto) {
    return this.forgotPassword(UserTypes.ADMIN, email);
  }

  @HttpCode(200)
  @Post('logout')
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  async logout(@CurrentUser() token: TokenPayload) {
    return this.authService.logout(token);
  }

  @Post('refresh')
  @DynamicGuards(
    new ClientJwtRefreshAuthGuard(),
    new TherapistJwtRefreshAuthGuard(),
    new AdminJwtRefreshAuthGuard()
  )
  async refreshToken(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
    @Body() { firebaseToken }: FirebaseTokenDto
  ) {
    return this.authService.refresh(user, firebaseToken);
  }

  @Post('google/client')
  async googleClientAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_client`,
    })(req, res);
  }

  @Post('google/therapist')
  async googleTherapistAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_therapist`,
    })(req, res);
  }

  @Post('google/admin')
  async googleAdminAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_admin`,
    })(req, res);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@CurrentUser() user: any, @Req() req, @Res() res: Response) {
    const role = req.query.state;

    const [firebaseToken, userRole] = role?.split('_');
    const result = await this.oAuthLogin(user, userRole, firebaseToken);
    res.json(result);
    // const redirectUrl = `${this.configService.get('FRONTEND_REDIRECT_URL')}?token=${result.accessToken}`;
    // res.redirect(redirectUrl);
  }

  // Helper Methods
  private async sendOtpForUserType(type: UserTypes, email: string, notFoundMessage: string) {
    try {
      const repo = await this.authService.getRepo(type);
      const user = await repo.findOne({ where: { email } });
      if (!user) throw new NotFoundException(notFoundMessage);
      await this.authService.emailOtp(type, user);
      return "An OTP has been sent to your Email.";
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async signupUser(type: UserTypes, dto: any) {
    try {
      switch (type) {
        case UserTypes.CLIENT:
          return this.authService.signupClient(dto);
        case UserTypes.THERAPIST:
          return this.authService.signupTherapist(dto);
        case UserTypes.ADMIN:
          return this.authService.signupAdmin(dto);
        default:
          throw new Error("Invalid user type for signup.");
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async resetPassword(type: UserTypes, dto: ResetPwdDto) {
    try {
      return this.authService.resetPassword(dto, type);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async forgotPassword(type: UserTypes, email: string) {
    try {
      return this.authService.forgotPassword(email, type);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async oAuthLogin(user, type: UserTypes, firebaseToken: string) {
    try {
      switch (type) {
        case UserTypes.CLIENT:
          return this.authService.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.CLIENT, firebaseToken)
        case UserTypes.THERAPIST:
          return await this.authService.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.THERAPIST, firebaseToken);
        case UserTypes.ADMIN:
          return await this.authService.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.ADMIN, firebaseToken);
        default:
          throw new Error("Invalid user type for oAuth login.");
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
