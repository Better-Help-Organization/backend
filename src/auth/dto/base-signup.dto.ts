import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsString, IsDateString } from "class-validator";
import { Gender, LANG } from "src/common/constants";
import { ValidPassword } from "src/common/decorators/valid-password";

export class BaseSignupDto {
  @ApiProperty({ description: 'First Name', example: 'Abebe' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last Name', example: 'Bekele' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email', example: 'tibesolomon7@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123' })
  @IsNotEmpty()
  @ValidPassword()
  password: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiProperty({ enum: LANG, example: LANG.EN })
  @IsEnum(LANG)
  @IsNotEmpty()
  lang: LANG;

  @ApiProperty({ description: 'Date of Birth', example: '2000-01-01' })
  @IsDateString()
  @IsNotEmpty()
  dob: Date;
}
