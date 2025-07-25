import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SessionStatus } from 'src/common/constants';

export class UpdateStatusDto {

  @ApiProperty({
    description: 'Status to be set for the session',
    example: SessionStatus.SCHEDULED,
  })
  @IsEnum(SessionStatus)
  status: SessionStatus;

  @ApiProperty({
    description: "Optional reason for the status change",
    example: "Client requested reschedule due to a conflict.",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
