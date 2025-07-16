import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";

export class TherapistSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Biography', example: 'Experienced in CBT and trauma counseling.' })
  @IsOptional()
  @IsString()
  bio?: string;
}
