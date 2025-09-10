import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

export class UpdateClientDto extends UpdateUserDto {
  @ApiProperty({ description: 'Whether the client is in a group', default: false })
  @IsBoolean()
  @IsOptional()
  isInGroup?: boolean;
}
