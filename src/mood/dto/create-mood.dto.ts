import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MoodValues } from "src/common/constants";

export class CreateMoodDto {
  @ApiProperty({
    description: 'Mood',
    example: MoodValues.NEUTRAL}
  )
  @IsEnum(MoodValues)
  @IsNotEmpty()
  mood: MoodValues;

  @ApiProperty({
    description: 'Note about the mood',
    example: 'asdasd'
    }
  )
  @IsString()
  @IsOptional()
  notes?: string;
}