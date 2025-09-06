import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
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

}
