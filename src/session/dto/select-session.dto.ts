import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class SelectSessionDto {
  @ApiProperty({
    description: 'The ID of the selected session',
    example: '25cb73b9-731c-477e-9c26-8ad9c54012af',
  })
  @IsUUID()
  selectedId: string;

  @ApiProperty({
    description: '🛑DEPRECATRED🛑 The IDs of the unselected sessions that should be deleted',
    example: [
      '5f2a8f92-91a3-4d5a-8b62-fd95d5ad45a2',
      '1c34af21-5cb4-44f1-b4d1-ef3b0bbfb876',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  unselectedIds?: string[];
}
