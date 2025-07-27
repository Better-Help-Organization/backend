import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";
import { IsValidPhoneNumber } from "src/common/decorators/IsValidPhoneNumber";

export class ClientSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Username', example: 'abebe123' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Emergency Contact', example: '911123456' })
  @IsOptional()
  @IsValidPhoneNumber()
  emergencyContact?: string;
}
