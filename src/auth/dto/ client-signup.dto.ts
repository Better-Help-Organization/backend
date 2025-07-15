import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";

export class ClientSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Username', example: 'abebe123' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Emergency Contact', example: '+251911123456' })
  @IsString()
  @IsNotEmpty()
  emergencyContact: string;
}
