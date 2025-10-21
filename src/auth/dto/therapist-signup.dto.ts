import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { BaseSignupDto } from "./base-signup.dto";

export class TherapistSignupDto extends BaseSignupDto {
  @ApiProperty({ description: 'Biography', example: 'Experienced in CBT and trauma counseling.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
  example: 10,
  description: "Short biography of the therapist",
  required: false,
  })
  @IsOptional()
  @IsNumber()
  hoursDedicatedPerWeek: number;
}
