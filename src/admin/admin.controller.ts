import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { TokenPayload } from 'src/common/constants';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.adminService.create(createAdminDto);
  // }

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
    @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Patch('me')
    @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(user.id, updateAdminDto);
  }

  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
