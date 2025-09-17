import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

export class UpdateTherapistDto extends UpdateUserDto {

    @ApiProperty({
        example: "Experienced therapist specializing in cognitive behavioral therapy.",
        description: "Short biography of the therapist",
        required: false,
    })
    @IsOptional()
    @IsString()
    bio: string;

    @ApiProperty({
    example: 10,
    description: "Short biography of the therapist",
    required: false,
    })
    @IsOptional()
    @IsNumber()
    hoursDedicatedPerWeek: number;

}
