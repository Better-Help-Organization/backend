import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

class BaseVerifyDto {

    @ApiProperty({
      description: 'OTP',
      example: '426189',
    })
    @IsString()
    otp: string;
    @ApiProperty({
      description: 'firebase generated token',
    })
    @IsString()
    @IsNotEmpty()
    firebaseToken: string
}

export class EmailVerifyDto extends BaseVerifyDto {
    
    @ApiProperty({
      description: 'Email',
      example: 'tibesolomon7@gmail.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

}

