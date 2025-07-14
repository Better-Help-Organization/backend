import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";


export class BaseOtpDto {

  @ApiProperty({
    description: 'OTP',
    example: '426189',
  })
  @IsString()
  otp: string;

}

export class EmailOtpDto extends BaseOtpDto {

  @ApiProperty({
    description: 'Email',
    example: 'tibesolomon7@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

}
