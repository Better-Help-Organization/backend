import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { FILE_UPLOAD_KEY, TokenPayload, ValidFolders } from 'src/common/constants';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
import { ApiBody, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
import { ValidatedFolder } from 'src/common/decorators/valid-folder.decorator';

@Controller('therapist')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get('me')
  @UseGuards(TherapistJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    return await this.therapistService.findOne(user.id,queryParams);
  }

  
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard()  
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.therapistService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.therapistService.findOne(id, queryParams);
  }

  @Patch('me')
  @DynamicGuards(
    new TherapistJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateTherapistDto: UpdateTherapistDto ) {
    return this.therapistService.update(user.id, updateTherapistDto);
  }

  @Patch(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateTherapistDto: UpdateTherapistDto) {
    return this.therapistService.update(id, updateTherapistDto);
  }

  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.therapistService.remove(id);
  }

  @Post('me/upload/:folder')
  @UseGuards(TherapistJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'folder',
    enum: Object.values(ValidFolders),
    required: true,
    description: 'Target folder: profile, licence, etc.',
  })
  @ApiQuery({
    name: 'modalId',
    type: 'string',
    required: false,
    description:
      'Required when folder is "licence". Associates the uploaded license with a specific modal.',
    example: '4be8f40a-123b-4e0a-b3f2-7767c64a88a6',
  })
  @ApiBody({
    description: 'File to upload. Folder comes from URL. modalId is passed via query, not body.',
    schema: {
      type: 'object',
      properties: {
        [FILE_UPLOAD_KEY]: {
          type: 'string',
          format: 'binary',
          description: 'Image or PDF file to upload',
        },
      },
    },
  })
  @UseInterceptors(UploadInterceptor)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @ValidatedFolder() _: ValidFolders,
  ) {
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
    };
  }
}
