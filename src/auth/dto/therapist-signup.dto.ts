import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";

export class TherapistSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Biography', example: 'Experienced in CBT and trauma counseling.' })
  @IsNotEmpty()
  @IsString()
  bio: string;

  @ApiProperty({ description: 'Initial rating (optional)', example: 0.0, default: 0.0 })
  @IsNumber()
  rating?: number;
}
