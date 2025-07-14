import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Gender } from "src/common/constants";
import { ValidPassword } from "src/common/decorators/valid-password";

export class SignupDto {

  @ApiProperty({
    description: 'name',
    example: 'Abebe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'email',
    example: 'tibesolomon7@gmail.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the admin account (required)',
    example: 'SecurePassword123', // Example value
  })
  @IsNotEmpty()
  @ValidPassword()
  password: string;

  @ApiProperty({
    description: 'Gender of the admin (required)',
    enum: Gender,
    example: Gender.MALE, // Example value
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

}
