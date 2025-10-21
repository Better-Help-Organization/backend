import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { BaseStatus } from "../constants";

export class StatusDto {
    @ApiProperty({
      description: 'New status of the Driver (required)',
      enum: BaseStatus,
      example: BaseStatus.ACTIVE,
    })
    @IsEnum(BaseStatus)
    @IsNotEmpty()
    status: BaseStatus;
}