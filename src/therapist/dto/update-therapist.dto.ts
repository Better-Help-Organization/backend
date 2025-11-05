import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ExpertiseValues } from 'src/common/constants';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';


export class ExpertiseDto {
  @ApiProperty({ enum: ExpertiseValues })
  @IsOptional()
  @IsEnum(ExpertiseValues)
  expertise: ExpertiseValues;
}


export class TherapistBankDto {
  @ApiProperty({
    description: 'Bank UUID from the global bank list',
    example: 'b3e6d68a-3931-4b90-b9d3-bbd3d40813b1',
  })
  @IsUUID()
  bankId: string;

  @ApiProperty({
    description: 'Therapist account number for this bank',
    example: '1234567890',
  })
  @IsString()
  accountNumber: string;

  @ApiProperty({
    description: 'Optional branch info',
    example: 'Addis Ababa Main Branch',
    required: false,
  })
  @IsOptional()
  @IsString()
  branch?: string;
}


export class UpdateTherapistDto extends UpdateUserDto {

    @ApiProperty({
    example: "Experienced therapist specializing in cognitive behavioral therapy.",
    description: "Short biography of the therapist",
    required: false,
    })
    @IsOptional()
    @IsString()
    bio: string;

    @ApiProperty({
    example: 10,
    description: "Short biography of the therapist",
    required: false,
    })
    @IsOptional()
    @IsNumber()
    hoursDedicatedPerWeek: number;

    @ApiProperty({
    type: [TherapistBankDto],
    description: 'Therapist bank accounts',
    required: false,
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TherapistBankDto)
    therapistBank?: TherapistBankDto[];

    @ApiProperty({
      type: [ExpertiseDto],
      description: "Therapist expertise list",
      required: false,
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExpertiseDto)
    expertise?: ExpertiseDto[];

    @ApiProperty({
      description: 'level UUID from the global bank list',
      example: 'b3e6d68a-3931-4b90-b9d3-bbd3d40813b1',
    })
    @IsOptional()
    @IsUUID()
    level: string;

}
