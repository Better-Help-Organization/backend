import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class EmailDto {
    @ApiProperty({
      description: 'Valid email',
      example: 'tibesolomon7@gmail.com',
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

}
