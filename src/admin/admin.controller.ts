import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFilterByDate, ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
import { AdminService } from './admin.service';
import { AdminStatisticsService } from './admin.stats';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly stats: AdminStatisticsService
  ) {}

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.adminService.create(createAdminDto);
  // }

  @Get('me')
  @ApiFindOneQueryParams()
  @UseGuards(AdminJwtAuthGuard)
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    console.log({user})
    return await this.adminService.findOne(user.id,queryParams);
  }


  @Get('stats')
  @ApiFilterByDate()
  @UseGuards(AdminJwtAuthGuard)
  async statistics(
    @CurrentUser() _: TokenPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stats.getSystemStats(startDate, endDate);
  }

  @Get()
  @ApiFindAllQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.adminService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  async findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return await this.adminService.findOne(id, queryParams);
  }

  @Patch('me')
  @DynamicGuards(
  new AdminJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(user.id, updateAdminDto);
  }

  @Patch(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
