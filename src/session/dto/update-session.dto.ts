import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { SessionStatus, SessionType } from 'src/common/constants';
import { IsFutureDateOrDateTime } from 'src/common/validators/is-future-date.validator';

export class StatusUpdateDto {
  @ApiProperty({
    enum: SessionStatus,
    description: 'Updated status of the session',
  })
  @IsNotEmpty()
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiProperty({
    description: 'Reason for the status change',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateSessionDto {

  @ApiProperty({
    description: 'UUID of the therapist assigned to the session',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
  })
  @IsOptional()
  @IsUUID()
  therapist?: string;

  @ApiProperty({
    description: 'Name of the group',
    example: 'Anxiety Support Group',
  })
  @IsOptional()
  @IsString()
  groupName: string;
  
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
  @IsOptional()
  @IsDateString()
  @IsFutureDateOrDateTime({ message: 'Session must be in the future' })
  schedule: Date;

  @ApiProperty({
    description: 'Duration of the session in minutes',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  duration: number;

  @ApiProperty({
    enum: SessionType,
    description: 'Type of the session',
    example: SessionType.VIDEO,
  })
  @IsOptional()
  @IsEnum(SessionType)
  type: SessionType;

  @ApiProperty({
    type: StatusUpdateDto,
    description: 'Status update object',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StatusUpdateDto)
  status?: StatusUpdateDto;

  // @ApiProperty({
  //   description: 'Indicates whether the client attended the session',
  //   example: false,
  //   default: false,
  // })
  // @IsOptional()
  // @IsBoolean()
  // hasclientAttended?: boolean;
}

export class AttendanceDto {

  @ApiProperty({
    description: 'Indicates whether the client attended the session',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasTherapistAttended: boolean;
}

export class AssignSessionDto {

  @ApiProperty({
    description: 'UUID of the therapist assigned to the session',
    example: 'f5a2b60a-d9a4-4f3b-96f1-7f4b68d3dce9',
  })
  @IsNotEmpty()
  @IsUUID()
  therapist?: string;
}

export class UpdateGroupSessionNoteEntry {
  @ApiProperty({
    description: 'UUID of the client belonging to this group session',
    example: '8e0c10f7-836b-4dfe-a21a-3b77e869c5c1',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'The note text assigned to the client for this session',
    example: 'Client participated actively and showed improvement.',
  })
  @IsString()
  note: string;
}

export class UpdateGroupSessionNote {
  @ApiProperty({
    description: 'List of notes for each client in the group session',
    type: [UpdateGroupSessionNoteEntry],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGroupSessionNoteEntry)
  notes: UpdateGroupSessionNoteEntry[];
}