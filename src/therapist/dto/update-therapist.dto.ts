import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

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

}
