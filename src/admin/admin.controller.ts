import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { FILE_UPLOAD_KEY, TokenPayload, ValidFolders } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ValidatedFolder } from 'src/common/decorators/valid-folder.decorator';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
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

  @Post('me/upload/:folder')
  @UseGuards(AdminJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'folder',
    enum: [ValidFolders.PROFILE],
    required: true,
    description: 'Target folder: profile, payment.',
  })
  @ApiBody({
    description: 'File to upload. Folder comes from URL.',
    schema: {
      type: 'object',
      properties: {
        [FILE_UPLOAD_KEY]: {
          type: 'string',
          format: 'binary',
          description: 'Image or PDF file to upload',
        },
      },
      required: [FILE_UPLOAD_KEY], 
    },
  })
  @UseInterceptors(UploadInterceptor)
  async upload(
    @CurrentUser() token: TokenPayload,
    @UploadedFile() file: Express.Multer.File,
    @ValidatedFolder() folder: ValidFolders
  ) {
    if (!file) {
      throw new BadRequestException('File upload is required');
    }

    if (folder === ValidFolders.PROFILE) {
      const finalFileName = await this.adminService.uploadProfile(token, file.filename);
      return {
        message: 'Profile updated successfully',
        filename: finalFileName,
      };
    }

    return {
      message: 'File uploaded successfully',
      filename: file.filename,
    };
  }
  
}
