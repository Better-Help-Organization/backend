import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { AdminRoles, BaseStatus } from 'src/common/constants';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

export class UpdateAdminDto extends UpdateUserDto {

    @ApiProperty({ enum: AdminRoles, description: 'Payment method used', example: AdminRoles.SUPPORT, required: false })
    @IsOptional()
    @IsIn([AdminRoles.DISPATCH, AdminRoles.SUPPORT])
    role?: AdminRoles;

    @ApiProperty({
        description: 'New status of the Driver (required)',
        enum: BaseStatus,
        example: BaseStatus.ACTIVE,
    })
    @IsEnum(BaseStatus)
    @IsOptional()
    status: BaseStatus;
}
