import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { LoggerService } from 'src/logger/logger.service';
import { User } from 'src/common/entities/user.entity';
import { EmailDto } from './dto/EmailDto';
import { SignupDto } from './dto/SignupDto';
import { EmailAuthGuard } from 'src/common/guard/email.guard';
import { LoginDto } from './dto/LoginDto';
import { Admin } from 'src/common/entities/admin.entity';
import { ResetPwdDto } from './dto/ResetPwdDto';
import { EmailVerifyDto } from './dto/VerifyOtpDto';
import { EmailPwdAuthGuard } from 'src/common/guard/email.pwd.guard';

import { 
  ClientJwtRefreshAuthGuard, 
  AdminJwtRefreshAuthGuard,
} from 'src/common/guard/jwt-refresh.guard';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';


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

  // @HttpCode(200)
  // @Post('otp/user')
  // async userOTP(
  //   @Body() {phoneNumber}: PhoneDto,
  // ) {
  //   try {
  //     const repo = await this.authService.getRepo(UserTypes.USER)
  
  //     const user = await repo.findOne({ where: { phoneNumber } });
    
  //     if(!user) throw new NotFoundException('User not found'); 
      
  //     await this.authService.smsOtp(UserTypes.USER, user);
      
  //     return "An OTP has been sent to your Phone Number."
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw error;
  //   }
  // }

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

  // @HttpCode(200)
  // @Post('signup/user')
  // async userSignup(
  //   @Body() userSignupDto: UserSignupDto
  // ) {
  //   try {
  //     return await this.authService.signupUser(userSignupDto);
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw error;
  //   }
  // }

  @HttpCode(200)
  @Post('signup/admin')
  async adminSignup(
    @Body() signupDto: SignupDto
  ) {
    try {
      return await this.authService.signupAdmin(signupDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  // @HttpCode(200)
  // @UseGuards(PhoneAuthGuard)
  // @Post('verify/user')
  // async userVerify(
  //   @CurrentUser() user: User,
  //   @Body() _: PhoneVerifyDto
  // ) { 
  //   return user 
  // }

  @HttpCode(200)
  @UseGuards(EmailAuthGuard)
  @Post('verify/admin')
  async adminVerify(
    @CurrentUser() admin: Admin,
    @Body() _: EmailVerifyDto
  ) { 
    return admin
  }

  // @HttpCode(200)
  // @UseGuards(PhoneLoginAuthGuard)
  // @Post('login/user')
  // async userLogin(
  //   @CurrentUser() user: User,
  //   @Body() _: UserLoginDto
  // ) {
  //   try {
  //     return user;
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw error;
  //   }
  // }

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
  @Post('resetPwd/admin')
  async resetPwd(@Body() resetPasswordDto: ResetPwdDto) {
    try {
      console.log("", {resetPasswordDto})
      return await this.authService.resetPassword(resetPasswordDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('forgotPwd/admin')
  async forgotPwd(@Body() {email}: EmailDto) {
    try {
      return await this.authService.forgotPassword(email);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('logout')
  @DynamicGuards(
    new ClientJwtAuthGuard()
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
