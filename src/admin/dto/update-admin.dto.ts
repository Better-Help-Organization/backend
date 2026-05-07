import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { AdminRoles, BaseStatus } from 'src/common/constants';
import { ValidPassword } from 'src/common/decorators/valid-password';
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

    @ApiProperty({
        description: 'New password',
        required: false,
        example: 'NewSecurePassword123'
    })
    @IsOptional()
    @ValidPassword()
    // @Transform(async ({ value }) => {
    // if (!value) return value;
    // return await hash(value, 10);
    // })
    password?: string;

}
