import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { ValidPassword } from "src/common/decorators/valid-password";


export class ResetPwdDto {
    @ApiProperty
    ({
      description: 'The email of the user.',
      example: 'tibesolomon7@gmail.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;
  
    @ApiProperty({
      description: 'password',
      example: 'SecurePassword123',
    })
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @ValidPassword()
    password: string;
  
    @ApiProperty({
      description: 'Confirmation of the new password.',
      example: 'SecurePassword123',
    })
    @IsNotEmpty()
    passwordConfirm: string;
  
    @ApiProperty({
      description: 'The OTP sent to the user\'s email.',
      example: '426189',
    })
    @IsNotEmpty()
    @IsString()
    otp: string;
  }
