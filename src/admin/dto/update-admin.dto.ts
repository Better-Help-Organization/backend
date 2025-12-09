import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { AdminRoles } from 'src/common/constants';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

export class UpdateAdminDto extends UpdateUserDto {

    @ApiProperty({ enum: AdminRoles, description: 'Payment method used', example: AdminRoles.SUPPORT, required: false })
    @IsOptional()
    @IsIn([AdminRoles.DISPATCH, AdminRoles.SUPPORT])
    role?: AdminRoles;

}
