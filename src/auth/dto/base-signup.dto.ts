import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Gender } from "src/common/constants";
import { IsValidPhoneNumber } from "src/common/decorators/IsValidPhoneNumber";
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

  @ApiProperty({
    description: 'phone number',
    example: '923621874',
  })
  @IsNotEmpty()
  @IsValidPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123' })
  @IsNotEmpty()
  @ValidPassword()
  password: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsNotEmpty()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ description: 'Date of Birth', example: '2000-01-01' })
  @IsDateString()
  dob: Date;
}
