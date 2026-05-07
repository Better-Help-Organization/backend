import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateMatchDto } from './create-match.dto';

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
    
    @ApiProperty({
    example: '6f1e5b39-c51a-4d38-a3b7-5cce7bcf7e24',
    description: 'UUID of the clients preference',
    })
    @IsOptional()
    @IsUUID()
    accepted: string;
    
}
