import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateQuoteDto {

    @ApiProperty({
        description: 'Content of the quote',
        example: 'Hello',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiProperty({
        description: 'Author of the quote',
        example: 'Hello',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    author?: string;
}
