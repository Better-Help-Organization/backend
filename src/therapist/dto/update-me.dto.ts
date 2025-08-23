import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateIndividualAvailabilityDto } from "src/availability/dto/create-individual-availability.dto";
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

    @ApiProperty({ type: [CreateIndividualAvailabilityDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIndividualAvailabilityDto)
    availability: CreateIndividualAvailabilityDto[];
    
}
