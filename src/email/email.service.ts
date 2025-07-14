import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from 'src/logger/logger.service';

interface email {
    to: string
    subject: string
    template: string
    context?: Record<string,any>
}

@Injectable()
export class EmailService {
    private APP_NAME: string;
    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
        private logger: LoggerService,
    ) {
        this.APP_NAME = this.configService.getOrThrow<string>('APP_NAME')
    }  

    private _msToMinutes(ms: number): number {
        return Math.floor(ms / 60000); // 1 minute = 60000 milliseconds
      }    

    async sendOtpEmail(data: { email: string; name: string; otp: string }) {  
        try {
            const { email, name, otp } = data;  
            const subject = `Your OTP Code for ${this.configService.getOrThrow<string>('APP_NAME')}`;  
            await this.mailerService.sendMail({  
            to: email,
            subject,  
            template: './otp',
            context: {  
                name,  
                otp,  
                expiration: this._msToMinutes(this.configService.getOrThrow<number>('OTP_EXPIRATION')),  
                APPNAME: this.APP_NAME,  
            },  
            });  
            this.logger.log(`OTP email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send OTP email to ${data.email}`, error.stack);
        }
    }

    async sendEmail({to, subject, template, context} :email){

        try {
        await this.mailerService.sendMail({ to, subject, template, 
            context:{
                ...context,
                APPNAME: this.APP_NAME,  
            }});

        this.logger.log(`Email with template ${template} sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send email to with template ${template} `, error);
        }   
    }
}
