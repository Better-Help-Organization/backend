import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

export class RemoveFromSessionDto {
  @ApiProperty({ type: [String], description: 'IDs of clients to remove from group sessions' })
  @IsArray()
  @IsUUID('all', { each: true })
  groupClients: string[];
}
