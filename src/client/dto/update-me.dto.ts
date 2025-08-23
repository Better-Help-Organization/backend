import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { UpdateUserDto } from "src/common/dto/update-user.dto";

export class UpdateMeDto extends UpdateUserDto {
    @ApiProperty({
        example: "A brief bio about the user",
        description: "Bio of the user",
        required: false,
    })
    @IsOptional()
    @IsString()
    bio: string;
}
