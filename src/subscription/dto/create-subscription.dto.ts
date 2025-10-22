import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'e48dbdc4-2152-45ef-91b8-4b76d0025b41' })
  @IsUUID()
  subscriptionId: string;
}
