import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientService } from 'src/client/client.service';
import { Client } from 'src/common/entities/client.entity';
import { getInclusiveColumns } from 'src/common/utils/getInclusiveColumns';
import { AdminService } from 'src/admin/admin.service';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { SignupDto } from './dto/SignupDto';
import * as speakeasy from 'speakeasy';
import { compare, hash } from 'bcryptjs';
import { ResetPwdDto } from './dto/ResetPwdDto';
import { EmailService } from 'src/email/email.service';
import { Admin } from 'src/common/entities/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';


@Injectable()
export class AuthService {

  constructor(
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
    private readonly clientService: ClientService,
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
  ){}


  private _getAccessTokenSecret(type: string) {
    switch (type) {
      case UserTypes.CLIENT:
        return this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET_USER');
      case UserTypes.ADMIN:
        return this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET_ADMIN');
      default:
        throw new BadRequestException('Unknown type: ' + type);
    }
  }


  private _getRefreshTokenSecret(type: string): string {
    switch (type) {
      case UserTypes.CLIENT:
        return this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET_USER');
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
      case UserTypes.ADMIN:
        return this.adminService.getRepository();
      default:
        throw new BadRequestException('Unknown user type: ' + type);
    }
  }

  getRepository(): Repository<Client> {
    return this.clientRepo;
  }

  async emailOtp(type:UserTypes, admin: Admin){
    
    const repo = await this.getRepo(type)
    
    const [OTP, OTPExpires] = this._generateOTP();
    
    admin.OTP = OTP;
    admin.OTPExpires = OTPExpires;

    await repo.save(admin);
    const { email, firstName } = admin
    this.emailService.sendOtpEmail({ email, name: firstName, otp:OTP });
  }

  async verifyByPhoneNumber(phoneNumber: string, otp: string, type: UserTypes) {  
    try {
      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof typeof user)[] = ['refreshToken', "OTP", "OTPExpires","isPhoneNumberAuthenticated"];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);
  
      const user = await repo.findOne({
        where: { phoneNumber },
        select: selectColumns
      });

      if (!user) throw new NotFoundException(`User not found`);

      if (user.isPhoneNumberAuthenticated){
          user.OTP = null
          return "This Phone Number is already authenticated"
      }

      this._verifyOTPExpiry(user.OTPExpires);

      if (user.OTP !== otp) throw new UnauthorizedException('Invalid OTP.');

      user.OTP = null; user.isPhoneNumberAuthenticated = true; 
      
      await repo.save(user);

      return user;
  
    } catch (err) {
      this.logger.error(err);
      throw new UnauthorizedException('Credentials are not valid.');
    }

  }

  async verifyByEmail(email: string, otp: string, type: UserTypes) {  
    try {
      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof typeof admin)[] = ['refreshToken', "isEmailAuthenticated","password"];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);
  
      const admin = await repo.findOne({
        where: { email },
        select: selectColumns
      });

      if (!admin) throw new NotFoundException(`Admin not found`);

      if (admin.isEmailAuthenticated){
          admin.OTP = null
          return "This email is already authenticated"
      }

      this._verifyOTPExpiry(admin.OTPExpires);

      if (admin.OTP !== otp) throw new UnauthorizedException('Invalid OTP.');

      admin.OTP = null; admin.isEmailAuthenticated = true; 
      
      await repo.save(admin);

      return admin;
  
    } catch (err) {
     
      this.logger.error(err);
    
      throw new UnauthorizedException('Credentials are not valid.');

    }
  }

  async signupUser(userSignupDto:SignupDto){

    const [OTP, OTPExpires] = this._generateOTP();

    userSignupDto["OTP"] = OTP;
    userSignupDto["OTPExpires"] = OTPExpires;

    const user = await this.clientService.create(userSignupDto);
    if(user !== null) return "An otp has been sent to your phone number, use it to verify your Phone Number" 
  }
 
  async signupAdmin(adminSignupDto:SignupDto){
  
  const [OTP, OTPExpires] = this._generateOTP();
  
  const hashedPassword = await hash(adminSignupDto.password, 10);

  adminSignupDto["OTP"] = OTP;
  adminSignupDto["OTPExpires"] = OTPExpires;
  adminSignupDto["password"] = hashedPassword;

  const admin = await this.adminService.create(adminSignupDto);
  if(admin !== null) return "An otp has been sent to your email, use it to verify your email" 
  }

  async loginUser(phoneNumber:string, otp:string, firebaseToken:string) {

    try{
      const type: UserTypes = UserTypes.CLIENT;

      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof Client)[] = ['OTP', 'OTPExpires'];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);

      const user = await repo.findOne({
        where: { phoneNumber },
        select: selectColumns,
        relations: {
          shops: true,
        }
      });
      if (!user) throw new NotFoundException('User not found');

      this._verifyOTPExpiry(user.OTPExpires);

      if (user.OTP !== otp) throw new UnauthorizedException("Invalid OTP, Try requesting another one");

      const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
      this._generateTokens({
        id: user.id,
        type,
        status: user.status,
      });

      user.refreshToken = refreshToken;
      user.OTP = null;
      user.firebaseToken = firebaseToken;
    
      await repo.save(user);

      return { accessToken, refreshToken, user };

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }


  async loginAdmin(email: string, password: string , firebaseToken: string) {

    try{

      const type: UserTypes = UserTypes.ADMIN;
      const repo = await this.getRepo(type);

      const inclusiveOf: (keyof  Admin | keyof typeof Admin)[] = ['password'];
      const { selectColumns } = await getInclusiveColumns(repo, inclusiveOf);

      const admin = await repo.findOne({
        where: { email },
        select: selectColumns,
      });
  
      if (!admin) throw new NotFoundException('Admin not found');
  
      const authenticated = await compare(password, admin['password']);
      if (!authenticated) {
        throw new UnauthorizedException();
      }

      const [accessToken, refreshToken, expiresAccessToken, expiresRefreshToken] =
      
      this._generateTokens({
        id: admin.id,
        type,
        status: admin.status,
      });

      admin.refreshToken = refreshToken;
      admin.firebaseToken = firebaseToken;
      
      await repo.save(admin);
  
      return { user:admin, accessToken, refreshToken };

    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async forgotPassword(email: string) {

  try {
      const repo = await this.getRepo(UserTypes.ADMIN);
      const user = await repo.findOne({ where: { email } });
  
      if (!user) throw new NotFoundException('User not found');
  
      const [OTP, OTPExpires] = this._generateOTP();
      user.OTP = OTP;
      user.OTPExpires = OTPExpires;
  
      await repo.save(user);
  
      this.emailService.sendOtpEmail({email, name:user.name , otp:OTP});
  
      return "An OTP has been sent to your Email, use it to reset your password.";
  
    } catch (error) {
      this.logger.error(error);
      throw error;
    } 
  }  

  async resetPassword(resetDto: ResetPwdDto) {

  try {

    const { email, otp, password, passwordConfirm } = resetDto
    
    const repo = await this.getRepo(UserTypes.ADMIN);

    const user = await repo.findOne({ where: { email } });

    if (!user) throw new NotFoundException('User not found');

    this._verifyOTPExpiry(user.OTPExpires);

    if (user.OTP !== otp) {
      throw new UnauthorizedException(
        "OTP doesn't match the one registered for the user. Try resending an OTP"
      );
    }

    const hashedPassword = await hash(password, 10);
    user.password = hashedPassword;
    user.OTP = null;
    user.OTPExpires = null;

    await repo.save(user);
    return user;
  }
    catch (error) {
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

  async _allowAdminAccess(user: TokenPayload, userId: string, accessTo:Exclude<UserTypes, UserTypes.ADMIN>) {
    try {
      
      let userToken: TokenPayload = null;
      
      if (user.type === UserTypes.ADMIN) {
        const service = this._getServiceByKind(accessTo);
          const { id, status  } = await service.findOne(userId );
          userToken = {
          id: id,
          status: status,
          type: accessTo,
        }
      }
      else userToken = user;
      
      return userToken;
    } catch (error) {
      this.logger.error(`Error handling admin or driver or user token: ${error.message}`);
      throw error;
    }
  }


  }
