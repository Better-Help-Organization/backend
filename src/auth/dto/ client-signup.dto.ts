import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";

export class ClientSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Username', example: 'abebe123' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Emergency Contact', example: '+251911123456' })
  @IsString()
  @IsOptional()
  emergencyContact?: string;
}
