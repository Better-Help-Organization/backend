import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { LoggerService } from 'src/logger/logger.service';
import { EmailDto } from './dto/EmailDto';
import { EmailAuthGuard } from 'src/common/guard/email.guard';
import { LoginDto } from './dto/LoginDto';
import { Admin } from 'src/common/entities/admin.entity';
import { ResetPwdDto } from './dto/ResetPwdDto';
import { EmailVerifyDto } from './dto/VerifyOtpDto';
import { EmailPwdAuthGuard } from 'src/common/guard/email.pwd.guard';

import { 
  ClientJwtRefreshAuthGuard, 
  AdminJwtRefreshAuthGuard,
  TherapistJwtRefreshAuthGuard,
} from 'src/common/guard/jwt-refresh.guard';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { TherapistSignupDto } from './dto/therapist-signup.dto';
import { ClientSignupDto } from './dto/ client-signup.dto';
import { Client } from 'src/common/entities/client.entity';
import { Therapist } from 'src/common/entities/therapist.entity';


class FirebaseTokenDto {
 
  @ApiProperty()
  @IsString()
  firebaseToken:string
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: LoggerService,
    private readonly authService: AuthService
  ) {}

  @HttpCode(200)
  @Post('otp/client')
  async clientOTP(
    @Body() {email}: EmailDto,
  ) {
    try {
      const repo = await this.authService.getRepo(UserTypes.CLIENT)
  
      const client = await repo.findOne({ where: { email } });
    
      if(!client) throw new NotFoundException('Client not found'); 
      
      await this.authService.emailOtp(UserTypes.CLIENT, client);
      
      return "An OTP has been sent to your Email."

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('otp/therapist')
  async therapistOTP(
    @Body() {email}: EmailDto,
  ) {
    try {
      const repo = await this.authService.getRepo(UserTypes.THERAPIST)
  
      const therapist = await repo.findOne({ where: { email } });
    
      if(!therapist) throw new NotFoundException('Therapist not found'); 
      
      await this.authService.emailOtp(UserTypes.THERAPIST, therapist);
      
      return "An OTP has been sent to your Email."

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('otp/admin')
  async adminOTP(
    @Body() {email}: EmailDto,
  ) {
    try {
      const repo = await this.authService.getRepo(UserTypes.ADMIN)
  
      const admin = await repo.findOne({ where: { email } });
    
      if(!admin) throw new NotFoundException('Admin not found'); 
      
      await this.authService.emailOtp(UserTypes.ADMIN, admin);
      
      return "An OTP has been sent to your Email."

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('signup/client')
  async clientSignup(
    @Body() clientSignupDto: ClientSignupDto
  ) {
    try {
      return await this.authService.signupClient(clientSignupDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('signup/therapist')
  async therapistSignup(
    @Body() therapistSignupDto: TherapistSignupDto
  ) {
    try {
      return await this.authService.signupTherapist(therapistSignupDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('signup/admin')
  async adminSignup(
    @Body() adminSignupDto: AdminSignupDto
  ) {
    try {
      return await this.authService.signupAdmin(adminSignupDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/client')
  async clientVerify(
    @CurrentUser() client: Client,
    @Body() _: EmailVerifyDto
  ) { 
    return client
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/therapist')
  async therapistVerify(
    @CurrentUser() therapist: Therapist,
    @Body() _: EmailVerifyDto
  ) { 
    return therapist
  }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/admin')
  async adminVerify(
    @CurrentUser() admin: Admin,
    @Body() _: EmailVerifyDto
  ) { 
    return admin
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/client')
  async clientLogin(
    @CurrentUser() client: Client,
    @Body() _: LoginDto
  ) {
    try {
      return client;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/therapist')
  async therapistLogin(
    @CurrentUser() therapist: Therapist,
    @Body() _: LoginDto
  ) {
    try {
      return therapist;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @UseGuards(EmailPwdAuthGuard)
  @Post('login/admin')
  async adminLogin(
    @CurrentUser() admin: Admin,
    @Body() _: LoginDto
  ) {
    try {
      return admin;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('resetPwd/client')
  async clientResetPwd(@Body() resetPasswordDto: ResetPwdDto) {
    try {
      console.log("", {resetPasswordDto})
      return await this.authService.resetPassword(resetPasswordDto, UserTypes.CLIENT);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('resetPwd/therapist')
  async therapistResetPwd(@Body() resetPasswordDto: ResetPwdDto) {
    try {
      console.log("", {resetPasswordDto})
      return await this.authService.resetPassword(resetPasswordDto, UserTypes.THERAPIST);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('resetPwd/admin')
  async adminResetPwd(@Body() resetPasswordDto: ResetPwdDto) {
    try {
      console.log("", {resetPasswordDto})
      return await this.authService.resetPassword(resetPasswordDto, UserTypes.ADMIN);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('forgotPwd/client')
  async clientForgotPwd(@Body() {email}: EmailDto) {
    try {
      return await this.authService.forgotPassword(email, UserTypes.CLIENT);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }  
  
  @HttpCode(200)
  @Post('forgotPwd/therapist')
  async therapistForgotPwd(@Body() {email}: EmailDto) {
    try {
      return await this.authService.forgotPassword(email, UserTypes.THERAPIST);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('forgotPwd/admin')
  async adminForgotPwd(@Body() {email}: EmailDto) {
    try {
      return await this.authService.forgotPassword(email, UserTypes.ADMIN);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('logout')
  @DynamicGuards(
    new ClientJwtAuthGuard()
    ,new TherapistJwtAuthGuard()
    ,new AdminJwtAuthGuard()
  )
  async logout(
    @CurrentUser() token: TokenPayload,
  ) {
    try {
      return await this.authService.logout(token);
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  @Post('refresh')
  @DynamicGuards(
    new ClientJwtRefreshAuthGuard()
    ,new TherapistJwtRefreshAuthGuard()
    ,new AdminJwtRefreshAuthGuard()
  )
  async refreshTokenAdmin(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
    @Body() {firebaseToken}: FirebaseTokenDto
  ) {
    try {
      return await this.authService.refresh(user, firebaseToken);
    } catch (err) {
      console.log("", {refresh:err})
      this.logger.error(err);
      throw err;
    }
  }
}
