import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested
} from 'class-validator';
import { DayOfWeek, SessionType } from 'src/common/constants';

export class DateWithTimes {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  date: DayOfWeek;

  @ApiProperty({
    type: [String],
    example: ['09:00', '11:00'],
  })
  @IsArray()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    each: true,
    message: 'Each start time must be in HH:mm format',
  })
  startTimes: string[];
}

export class baseSession {

  @ApiProperty({
    description: 'Content of the note',
    example: 'Client reported improved mood since last session.',
  })
  @IsOptional()
  @IsString()
  note: string;


  @ApiProperty({
    description: 'Name of the group',
    example: 'Anxiety Support Group',
  })
  @IsOptional()
  @IsString()
  groupName: string;

  @ApiProperty({
    type: [DateWithTimes],
    description: 'Weekday + start times',
    example: [
      { date: DayOfWeek.MONDAY, startTimes: ['09:00', '11:00'] },
      { date: DayOfWeek.WEDNESDAY, startTimes: ['10:00'] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateWithTimes)
  dates: DateWithTimes[];

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
  @IsOptional()
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