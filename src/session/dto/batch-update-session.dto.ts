import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested
} from 'class-validator';

export class BatchSessionUpdateFieldsDto {
  @ApiProperty({
    description: 'UUID of the therapist assigned to all sessions',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  therapist?: string;

  // @ApiProperty({
  //   description: 'New scheduled date/time for all sessions',
  //   example: '2025-08-12T14:30:00Z',
  //   required: false,
  // })
  // @IsOptional()
  // @IsDateString()
  // schedule?: Date;

  // @ApiProperty({
  //   type: StatusUpdateDto,
  //   description: 'Status update for all sessions',
  //   required: false,
  // })
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => StatusUpdateDto)
  // status?: StatusUpdateDto;
}

export class BatchUpdateSessionDto {
  @ApiProperty({
    description: 'Common ID for grouped sessions',
    example: 'd43b2298-5437-4fee-a4c2-b4d6b47a5519',
  })
  @IsUUID()
  commonId: string;

  @ApiProperty({
    description: 'Sessions to exclude from update',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  excludedSessionIds?: string[];

  @ApiProperty({
    type: BatchSessionUpdateFieldsDto,
    description: 'Fields to update across sessions',
  })
  @ValidateNested()
  @Type(() => BatchSessionUpdateFieldsDto)
  updates: BatchSessionUpdateFieldsDto;
}
