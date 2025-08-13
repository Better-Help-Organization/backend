import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { AdminService } from 'src/admin/admin.service';
import { ClientService } from 'src/client/client.service';
import { BaseStatus, TokenPayload, UserTypes } from 'src/common/constants';
import { Client } from 'src/common/entities/client.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { User } from 'src/common/entities/user.entity';
import { getInclusiveColumns } from 'src/common/utils/getInclusiveColumns';
import { EmailService } from 'src/email/email.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Repository } from 'typeorm';
import { ClientSignupDto } from './dto/ client-signup.dto';
import { AdminSignupDto } from './dto/admin-signup.dto';
import { ResetPwdDto } from './dto/ResetPwdDto';
import { TherapistSignupDto } from './dto/therapist-signup.dto';
import { Admin } from 'src/common/entities/admin.entity';

@Injectable()
export class AuthService {

  constructor(
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
    private readonly clientService: ClientService,
    private readonly therapistService: TherapistService,
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(Therapist) private therapistRepo: Repository<Therapist>,
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
  ){}

  private _getAccessTokenSecret(type: string) {
    switch (type) {
      case UserTypes.CLIENT:
        return this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET_CLIENT');
      case UserTypes.THERAPIST:
        return this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET_THERAPIST');
      case UserTypes.ADMIN:
        return this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET_ADMIN');
      default:
        throw new BadRequestException('Unknown type: ' + type);
    }
  }

  private _getRefreshTokenSecret(type: string): string {
    switch (type) {
      case UserTypes.CLIENT:
        return this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET_CLIENT');
      case UserTypes.THERAPIST:
        return this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET_THERAPIST');
      case UserTypes.ADMIN:
        return this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET_ADMIN');
      default:
        throw new BadRequestException('Unknown type: ' + type);
    }
  }

  private _generateTokens({ id, type, status }: TokenPayload): [string, string, Date, Date] {
    
    const expiresAccessToken = new Date();
    
    expiresAccessToken.setMilliseconds(
      expiresAccessToken.getTime() +
      parseInt(
        this.configService.getOrThrow<string>(
          'JWT_ACCESS_TOKEN_EXPIRATION_MS',
        ),
      ),
    );
  
    const expiresRefreshToken = new Date();
    
    expiresRefreshToken.setMilliseconds(
      expiresRefreshToken.getTime() +
      parseInt(
        this.configService.getOrThrow<string>(
          'JWT_REFRESH_TOKEN_EXPIRATION_MS',
        ),
      ),
    );
  
    const tokenPayload: TokenPayload = { id, type, status };
  
    const accessTokenSecret = this._getAccessTokenSecret(type);
    const refreshTokenSecret = this._getRefreshTokenSecret(type);
  
    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: accessTokenSecret,
      expiresIn: `${this.configService.getOrThrow<string>(
        'JWT_ACCESS_TOKEN_EXPIRATION_MS',
      )}ms`,
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: refreshTokenSecret,
      expiresIn: `${this.configService.getOrThrow(
        'JWT_REFRESH_TOKEN_EXPIRATION_MS',
      )}ms`,
    });

    return [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken];
  }

  private _verifyOTPExpiry(otpExpires: Date): void {
    if (!otpExpires)
        throw new BadRequestException('OTP is malformed. Please request a new OTP.');
      if (otpExpires < new Date())
        throw new UnauthorizedException('OTP has expired. Please request a new one.');
  }

  private _generateOTP(): [string, Date] {

    let secret = null;
    process.env.NODE_ENV === 'prod' 
    ? secret = (speakeasy.generateSecret()).base32
    : secret = this.configService.getOrThrow<string>('OTP_SECRET')
  
    const OTP = speakeasy.totp({
      secret,
      encoding: 'base32',
      digits: 6,
      time: this.configService.getOrThrow<number>('OTP_EXPIRATION'),
    }).toString();
  
    const OTPExpires = new Date(Date.now() + this.configService.get<number>('OTP_EXPIRATION') * 60000);
  
    return [OTP, OTPExpires];
  }

  async getRepo(type:UserTypes): Promise<Repository<any>> {
    switch (type) {
      case UserTypes.CLIENT:
        return this.clientService.getRepository();
      case UserTypes.THERAPIST:
        return this.therapistService.getRepository();
      case UserTypes.ADMIN:
        return this.adminService.getRepository();
      default:
        throw new BadRequestException('Unknown user type: ' + type);
    }
  }

  // getRepository(): Repository<Client> {
  //   return this.clientRepo;
  // }

  async emailOtp<T extends User>(type: UserTypes, user: T) {
    this.logger.debug(`[emailOtp] Sending OTP to ${user.email} (type: ${type})`);
    const repo = await this.getRepo(type);
    const [OTP, OTPExpires] = this._generateOTP();

    user.OTP = OTP;
    user.OTPExpires = OTPExpires;
    await repo.save(user);

    const { email, firstName, lastName } = user;
    const name = firstName + " " + lastName;

    this.logger.debug(`Sending OTP to ${user.email} (role: ${type})`);
    this.emailService.sendOtpEmail({ email, name, otp: OTP });
  }

  async verifyByEmail(email: string, otp: string, type: UserTypes) {  
    try {
      const repo = await this.getRepo(type);
      const inclusiveOf: (keyof User)[] = ['refreshToken', 'isEmailAuthenticated', 'password'];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);
  
      const user = await repo.findOne({
        where: { email },
        select: selectColumns
      });

      if (!user) throw new NotFoundException(`${type}\` not found`);

      if (user.isEmailAuthenticated){
          user.OTP = null
          return "This email is already authenticated"
      }

      this._verifyOTPExpiry(user.OTPExpires);

      if (user.OTP !== otp) throw new UnauthorizedException('Invalid OTP.');

      user.OTP = null; user.isEmailAuthenticated = true; 
      
      await repo.save(user);

      return user;
  
    } catch (err) {
     
      this.logger.error(err);
    
      throw new UnauthorizedException('Credentials are not valid.');

    }
  }

  async signupClient(clientSignupDto: ClientSignupDto) {
    const [OTP, OTPExpires] = this._generateOTP();
    
    const hashedPassword = await hash(clientSignupDto.password, 10);
    
    clientSignupDto["OTP"] = OTP;
    clientSignupDto["OTPExpires"] = OTPExpires;
    clientSignupDto["password"] = hashedPassword;

    const client = await this.clientService.create(clientSignupDto);

    const [accessToken, refreshToken] =
        this._generateTokens({
          id: client.id,
          type: UserTypes.CLIENT,
          status: client.status,
      });
    
    client.refreshToken = refreshToken;
    client.firebaseToken = clientSignupDto?.firebaseToken ? clientSignupDto?.firebaseToken : '';
    this.clientRepo.save(client)
    await this.clientRepo.save(client);

    
    if (client !== null) {
      await this.emailOtp(UserTypes.CLIENT, client);
      return {user:client, accessToken,refreshToken};
    }
  }
 
  async signupTherapist(therapistSignupDto: TherapistSignupDto) {
    const [OTP, OTPExpires] = this._generateOTP();
    
    const hashedPassword = await hash(therapistSignupDto.password, 10);
    
    therapistSignupDto["OTP"] = OTP;
    therapistSignupDto["OTPExpires"] = OTPExpires;
    therapistSignupDto["password"] = hashedPassword;

    const therapist = await this.therapistService.create(therapistSignupDto);

    const [accessToken, refreshToken] =
        this._generateTokens({
          id: therapist.id,
          type: UserTypes.THERAPIST,
          status: therapist.status,
      });
    
    therapist.refreshToken = refreshToken;
    therapist.firebaseToken = therapistSignupDto?.firebaseToken ? therapistSignupDto?.firebaseToken : '';
    this.therapistRepo.save(therapist)
    await this.therapistRepo.save(therapist);
    
    if (therapist !== null) {
      await this.emailOtp(UserTypes.THERAPIST, therapist);
      return { user:therapist, accessToken, refreshToken };
    }
  }

  async signupAdmin(adminSignupDto:AdminSignupDto){
    const [OTP, OTPExpires] = this._generateOTP();
    
    const hashedPassword = await hash(adminSignupDto.password, 10);

    adminSignupDto["OTP"] = OTP;
    adminSignupDto["OTPExpires"] = OTPExpires;
    adminSignupDto["password"] = hashedPassword;

    const admin = await this.adminService.create(adminSignupDto);

      const [accessToken, refreshToken] =
        this._generateTokens({
          id: admin.id,
          type: UserTypes.ADMIN,
          status: admin.status,
      });
    
    admin.refreshToken = refreshToken;
    admin.firebaseToken = adminSignupDto?.firebaseToken ? adminSignupDto?.firebaseToken : '';
    this.adminRepo.save(admin)
    await this.adminRepo.save(admin);
    if(admin !== null) {
      await this.emailOtp(UserTypes.ADMIN, admin);
      return { user:admin, accessToken, refreshToken };
    }
  }

  async loginUser(email: string, password: string , firebaseToken: string, type: UserTypes) {

    try{

      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof  User)[] = ['password'];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);

      const user = await repo.findOne({ where: { email }, select: selectColumns });
      if (!user) throw new NotFoundException(`${type} not found`);

      if (user.isLinked && !user.password) {
        throw new UnauthorizedException(
          'You previously signed in using Google. Please use Google Sign-In again, or use "Forgot Password" to set a password and sign in with email next time.'
        );
      }

      if (type !== UserTypes.ADMIN && !user.isEmailAuthenticated) {
        throw new UnauthorizedException('Email is not verified.');
      }

      const authenticated = await compare(password, user['password']);
      if (!authenticated) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
        this._generateTokens({
          id: user.id,
          type,
          status: user.status,
      });

      user.refreshToken = refreshToken;
      user.firebaseToken = firebaseToken;
      await repo.save(user);

      return { user, accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

    async loginUserPhone(phoneNumber: string, password: string , firebaseToken: string, type: UserTypes) {

    try{

      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof  User)[] = ['password'];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);

      const user = await repo.findOneOrFail({ where: { phoneNumber }, select: selectColumns });
      if (!user) throw new NotFoundException(`${type} not found`);

      const authenticated = await compare(password, user['password']);
      if (!authenticated) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
        this._generateTokens({
          id: user.id,
          type,
          status: user.status,
      });

      user.refreshToken = refreshToken;
      user.firebaseToken = firebaseToken;
      await repo.save(user);

      return { user, accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async loginOAuthUser(user: User, firebaseToken: string, type: UserTypes) {
    const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
      this._generateTokens({
        id: user.id,
        type,
        status: user.status,
      });

    user.refreshToken = refreshToken;
    user.firebaseToken = firebaseToken;

    await (await this.getRepo(type)).save(user);

    return { user, accessToken, refreshToken };
  }

  async forgotPassword(type: UserTypes, email: string) {

  try {
      const repo = await this.getRepo(type);
      const user = await repo.findOne({ where: { email } });
  
      if (!user) throw new NotFoundException('User not found');
  
      const [OTP, OTPExpires] = this._generateOTP();
      user.OTP = OTP;
      user.OTPExpires = OTPExpires;
  
      await repo.save(user);

      const name = user.firstName + " " + user.lastName
      this.emailService.sendOtpEmail({email, name: name , otp:OTP});
  
      return "An OTP has been sent to your Email, use it to reset your password.";
  
    } catch (error) {
      this.logger.error(error);
      throw error;
    } 
  }  

  async resetPassword(type: UserTypes, resetDto: ResetPwdDto) {
    try {
      const { email, otp, password, passwordConfirm } = resetDto;

      if (password !== passwordConfirm) {
        throw new BadRequestException('Password does not match confirm password');
      }

      const repo = await this.getRepo(type);
      const user = await repo.findOne({ where: { email } });

      if (!user) throw new NotFoundException('User not found');

      this._verifyOTPExpiry(user.OTPExpires);

      if (user.OTP !== otp) {
        throw new UnauthorizedException("OTP doesn't match. Try resending.");
      }

      if (user.password) {
        const isSameAsCurrent = await compare(password, user.password);
        if (isSameAsCurrent) {
          throw new BadRequestException('New password must be different from current password.');
        }
      }

      const hashedPassword = await hash(password, 10);

      user.password = hashedPassword;
      user.OTP = null;
      user.OTPExpires = null;

      await repo.save(user);

      return { message: 'Password successfully reset.' };

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async logout(token: TokenPayload) {
    const { id,status,type } = token
    const repo = await this.getRepo(type);
    const user = await repo.findOne({ where: { id } });

    if (!user) throw new NotFoundException('User not found');

    user.refreshToken = null;
    // user.OTP = null;
    // user.OTPExpires = null;
    user.firebaseToken = null;

    await repo.save(user);

    return 'You have successfully logged out';
  }

  async refresh(userToken: TokenPayload, firebaseToken:string) {

    try{
      const type = userToken.type;

      const repo = await this.getRepo(type);

      const user = await repo.findOneOrFail({
        where: { id: userToken.id },
      });

      if (!user) throw new NotFoundException('User not found');


      const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
      this._generateTokens({
        id: user.id,
        type,
        status: user.status,
      });

      user.refreshToken = refreshToken;
      user.firebaseToken = firebaseToken;
    
      await repo.save(user);

      return { user, accessToken, refreshToken };

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  public _getServiceByKind(user: UserTypes) {
    try {
      switch (user) {
        case UserTypes.CLIENT:
          return this.clientService
        case UserTypes.THERAPIST:
          return this.therapistService
        case UserTypes.ADMIN:
            return this.adminService
        default:
          throw new BadRequestException('Unknown kind of user: ' + user);
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async oAuthLogin(user, type: UserTypes, firebaseToken: string) {
    try {
      switch (type) {
        case UserTypes.CLIENT:
          return this.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.CLIENT, firebaseToken)
        case UserTypes.THERAPIST:
          return await this.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.THERAPIST, firebaseToken);
        case UserTypes.ADMIN:
          return await this.handleOAuthLogin(user.email, user.firstName, user.lastName, UserTypes.ADMIN, firebaseToken);
        default:
          throw new Error("Invalid user type for oAuth login.");
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }


  async handleOAuthLogin(email: string, firstName: string, lastName: string, type: UserTypes, firebaseToken: string) {
    const repo = await this.getRepo(type);
    let user = await repo.findOne({ where: { email } });
    if (!user) {
      const [OTP, OTPExpires] = this._generateOTP();

      const newUser = await repo.save({
        email,
        firstName,
        lastName,
        password: null,
        OTP,
        OTPExpires,
        isEmailAuthenticated: true,
        status: BaseStatus.ACTIVE,
        firebaseToken,
        isLinked: true,
      } as any);

      return this.loginOAuthUser(newUser, firebaseToken, type);
    }

    // If user exists, just log them in
    return this.loginOAuthUser(user, user.firebaseToken || firebaseToken, type);
  }


  // Helper Methods
  async sendOtpForUserType(type: UserTypes, email: string) {
    try {
      const repo = await this.getRepo(type);
      const user = await repo.findOne({ where: { email } });
      if (!user) throw new NotFoundException(`${type} not found`);
      await this.emailOtp(type, user);
      return "An OTP has been sent to your Email.";
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async signupUser(type: UserTypes, dto: any) {
    try {
      switch (type) {
        case UserTypes.CLIENT:
          return this.signupClient(dto);
        case UserTypes.THERAPIST:
          return this.signupTherapist(dto);
        case UserTypes.ADMIN:
          return this.signupAdmin(dto);
        default:
          throw new Error("Invalid user type for signup.");
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }


  // async _allowAdminAccess(user: TokenPayload, userId: string, accessTo:Exclude<UserTypes, UserTypes.ADMIN>) {
  //   try {
      
  //     let userToken: TokenPayload = null;
      
  //     if (user.type === UserTypes.ADMIN) {
  //       const service = this._getServiceByKind(accessTo);
  //         const { id, status  } = await service.findOne(id );
  //         userToken = {
  //         id: id,
  //         status: status,
  //         type: accessTo,
  //       }
  //     }
  //     else userToken = user;
      
  //     return userToken;
  //   } catch (error) {
  //     this.logger.error(`Error handling admin or driver or user token: ${error.message}`);
  //     throw error;
  //   }
  // }
}