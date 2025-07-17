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
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import passport from 'passport';
import { oAuthDto } from './dto/oauth.dto';

class FirebaseTokenDto {
  @ApiProperty()
  @IsString()
  firebaseToken: string;
}

enum CLIENTTYPE {
  MOBILE = "mobile",
  WEB = "web"
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
    return this.authService.sendOtpForUserType(UserTypes.CLIENT, email);
  }

  @HttpCode(200)
  @Post('otp/therapist')
  async therapistOTP(@Body() { email }: EmailDto) {
    return this.authService.sendOtpForUserType(UserTypes.THERAPIST, email);
  }

  @HttpCode(200)
  @Post('otp/admin')
  async adminOTP(@Body() { email }: EmailDto) {
    return this.authService.sendOtpForUserType(UserTypes.ADMIN, email);
  }

  @HttpCode(200)
  @Post('signup/client')
  async clientSignup(@Body() dto: ClientSignupDto) {
    return this.authService.signupUser(UserTypes.CLIENT, dto);
  }

  @HttpCode(200)
  @Post('signup/therapist')
  async therapistSignup(@Body() dto: TherapistSignupDto) {
    return this.authService.signupUser(UserTypes.THERAPIST, dto);
  }

  @HttpCode(200)
  @Post('signup/admin')
  async adminSignup(@Body() dto: AdminSignupDto) {
    return this.authService.signupUser(UserTypes.ADMIN, dto);
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
    return this.authService.resetPassword(UserTypes.CLIENT, dto);
  }

  @HttpCode(200)
  @Post('resetPwd/therapist')
  async therapistResetPwd(@Body() dto: ResetPwdDto) {
    return this.authService.resetPassword(UserTypes.THERAPIST, dto);
  }

  @HttpCode(200)
  @Post('resetPwd/admin')
  async adminResetPwd(@Body() dto: ResetPwdDto) {
    return this.authService.resetPassword(UserTypes.ADMIN, dto);
  }

  @HttpCode(200)
  @Post('forgotPwd/client')
  async clientForgotPwd(@Body() { email }: EmailDto) {
    return this.authService.forgotPassword(UserTypes.CLIENT, email);
  }

  @HttpCode(200)
  @Post('forgotPwd/therapist')
  async therapistForgotPwd(@Body() { email }: EmailDto) {
    return this.authService.forgotPassword(UserTypes.THERAPIST, email);
  }

  @HttpCode(200)
  @Post('forgotPwd/admin')
  async adminForgotPwd(@Body() { email }: EmailDto) {
    return this.authService.forgotPassword(UserTypes.ADMIN, email);
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

  @Get('google/client')
  async googleClientAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: 'client',
    })(req, res);
  }

  @Get('google/therapist')
  async googleTherapistAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: 'therapist',
    })(req, res);
  }

  @Get('google/admin')
  async googleAdminAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('google', {
      state: 'admin',
    })(req, res);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@CurrentUser() user: any, @Req() req, @Res() res: Response) {
    const role = req.query.state;
    const result = await this.oAuthLogin(user, role);
    res.json(result);
    // const redirectUrl = `${this.configService.get('FRONTEND_REDIRECT_URL')}?token=${result.accessToken}`;
    // res.redirect(redirectUrl);
  }

    @Get('github/client')
  async githubClientAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('github', {
      state: 'client',
    })(req, res);
  }

  @Get('github/therapist')
  async githubTherapistAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('github', {
      state: 'therapist',
    })(req, res);
  }

  @Get('github/admin')
  async githubAdminAuth(@Req() req: Request, @Res() res: Response) {
    return passport.authenticate('github', {
      state: 'admin',
    })(req, res);
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@CurrentUser() user: any, @Req() req, @Res() res: Response) {
    const role = req.query.state;
    const result = await this.oAuthLogin(user, role);
    res.json(result);
    // res.redirect(`${this.configService.get('FRONTEND_REDIRECT_URL')}?token=${result.accessToken}`);
  }

  @Post(`google/${UserTypes.CLIENT}`)
  async googleClientAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    const clientType = req.query.client
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_${UserTypes.CLIENT}_${clientType}`,
    })(req, res);
  }

  @Post(`google/${UserTypes.THERAPIST}`)
  async googleTherapistAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    const clientType = req.query.client
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_${UserTypes.THERAPIST}_${clientType}`,
    })(req, res);
  }

  @Post(`google/${UserTypes.ADMIN}`)
  async googleAdminAuth(@Body() dto: oAuthDto, @Req() req: Request, @Res() res: Response) {
    const clientType = req.query.client
    return passport.authenticate('google', {
      state: `${dto.firebaseToken}_${UserTypes.ADMIN}_${clientType}`,
    })(req, res);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@CurrentUser() user: any, @Req() req) {
    const role = req.query.state;

    const [firebaseToken, userRole, _] = role?.split('_');
    const result = await this.authService.oAuthLogin(user, userRole, firebaseToken);
    return result;
  }

}
