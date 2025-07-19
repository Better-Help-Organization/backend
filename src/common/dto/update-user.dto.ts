import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { Gender } from "src/common/constants";
import { IsValidPhoneNumber } from "src/common/decorators/IsValidPhoneNumber";

export class UpdateUserDto {
    
    @ApiProperty({
        example: "John",
        description: "First name of the user",
        required: false,
    })
    @IsOptional()
    @IsString()
    firstName: string;

    @ApiProperty({
        example: "Doe",
        description: "Last name of the user",
        required: false,
    })
    @IsOptional()
    @IsString()
    lastName: string;

    @ApiProperty({
        example: "john_doe99",
        description: "Unique username",
        required: false,
    })
    @IsOptional()
    @IsString()
    username: string;

    @ApiProperty({
        example: "+251911234567",
        description: "Emergency contact phone number in international format",
        required: false,
    })
    @IsOptional()
    @IsValidPhoneNumber()
    emergencyContact: string;

    @ApiProperty({
        enum: Gender,
        example: Gender.MALE,
        description: "Gender of the user",
        required: false,
    })
    @IsOptional()
    @IsEnum(Gender)
    gender: Gender;

    @ApiProperty({
        example: "1990-05-15T00:00:00.000Z",
        description: "Date of birth (ISO format)",
        required: false,
        type: String,
    })
    @IsOptional()
    @IsDate()
    dob: Date;
}
