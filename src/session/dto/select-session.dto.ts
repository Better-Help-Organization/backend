import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectSessionDto {
  @ApiProperty({
    description: 'The ID of the selected session',
    example: '25cb73b9-731c-477e-9c26-8ad9c54012af',
  })
  @IsUUID()
  selectedId: string;

  @ApiProperty({
    description: 'The commonId of the selected session',
    example: '25cb73b9-731c-477e-9c26-8ad9c54012af',
  })
  @IsUUID()
  commonId: string;
}
