import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIndividualAvailabilityDto } from './create-individual-availability.dto';

export class CreateAvailabilityDto {
  @ApiProperty({ type: [CreateIndividualAvailabilityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIndividualAvailabilityDto)
  availability: CreateIndividualAvailabilityDto[];
}
