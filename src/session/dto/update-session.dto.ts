import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { SessionType } from 'src/common/constants';
import { IsFutureDateOrDateTime } from 'src/common/validators/is-future-date.validator';

export class UpdateSessionDto {

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
}
