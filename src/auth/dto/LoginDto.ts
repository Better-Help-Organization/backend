import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { IsValidPhoneNumber } from "src/common/decorators/IsValidPhoneNumber";
import { ValidPassword } from "src/common/decorators/valid-password";


export class LoginDto {

  // @ApiProperty({
  //   description: 'email',
  //   example: 'tibesolomon7@gmail.com',
  // })
  // @IsEmail()
  // @IsNotEmpty()
  // email: string;

  @ApiProperty({
      description: 'phone number',
      example: '923621874',
  })
  @IsNotEmpty()
  @IsValidPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'password',
    example: 'SecurePassword123',
  })      
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @ValidPassword()
  password: string;
  
  @ApiProperty({
    description: 'firebase generated token',
  })
  @IsString()
  @IsNotEmpty()
  firebaseToken: string

}
