import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { SubscriptionType } from "src/common/constants";

const SubscriptionTypeKeys = Object.keys(SubscriptionType) as ReadonlyArray<keyof typeof SubscriptionType>;

export class CreateAdminSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionTypeKeys, // ← Shows KEYS in Swagger
    example: 'MONTHLY',
    description: 'Subscription type key',
  })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({ example: 580 })
  @IsOptional()
  @IsInt()
  @Min(0)
  old_price: number;

  @ApiProperty({ example: 499 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 'e48dbdc4-2152-45ef-91b8-4b76d0025b41' })
  @IsUUID()
  level: string;

  @ApiProperty({ example: 'e48dbdc4-2152-45ef-91b8-4b76d0025b41' })
  @IsUUID()
  modal: string;
}
