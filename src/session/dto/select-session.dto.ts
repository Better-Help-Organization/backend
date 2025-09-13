import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SelectSessionDto {
  @ApiProperty({
    description: 'The ID of the selected session',
    example: '2a7e6d68a-3931-4b90-b9d3-bbd3d40813b1',
  })
  @IsUUID()
  selectedId: string;

  @ApiProperty({
    description: 'The IDs of the unselected sessions that should be deleted',
    example: [
      '5f2a8f92-91a3-4d5a-8b62-fd95d5ad45a2',
      '1c34af21-5cb4-44f1-b4d1-ef3b0bbfb876',
    ],
    required: false,
  })
  @IsArray()
  @IsUUID('all', { each: true })
  unselectedIds?: string[];
}
