import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';
import { SessionType } from 'src/common/constants';

export class baseSession {

  @ApiProperty({
    description: 'Content of the note',
    example: 'Client reported improved mood since last session.',
  })
  @IsOptional()
  @IsString()
  note: string;

  @ApiProperty({
    description: 'Scheduled start date and time of the session',
    example: '2025-08-12T14:30:00Z',
  })
  @IsDateString()
  schedule: string;

  @ApiProperty({
    description: 'Duration of the session in minutes',
    example: 60,
  })
  @IsInt()
  duration: number;

  @ApiProperty({
    enum: SessionType,
    description: 'Type of the session',
    example: SessionType.VIDEO,
  })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiProperty({
    description: 'UUID of the modal of the  session',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
  })
  @IsNotEmpty()
  @IsUUID()
  modal?: string;

}

export class CreateSessionDto extends baseSession {

  @ApiProperty({
    description: 'UUID of the therapist assigned to the session',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
  })
  @IsNotEmpty()
  @IsUUID()
  client?: string;

}

export class CreateGroupSession extends baseSession {
  @ApiProperty({
    description: 'Array of client UUIDs for group sessions',
    example: [
      'a7e6d68a-3931-4b90-b9d3-bbd3d40813b1',
      'c2633123-1e65-4c3e-a2a3-3b8b78901c3f',
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('all', { each: true })
  groupClients?: string[];

  @ApiProperty({
    description: 'UUID of the therapist assigned to the session',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
  })
  @IsNotEmpty()
  @IsUUID()
  therapist?: string;
} 