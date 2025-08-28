import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { FILE_UPLOAD_KEY, TokenPayload, ValidFolders } from 'src/common/constants';
import { AuthEnforcedQueryParams } from 'src/common/decorators/auth-enforced-query-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ValidatedFolder } from 'src/common/decorators/valid-folder.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { TherapistService } from './therapist.service';
import { SessionService } from 'src/session/session.service';

@Controller('therapist')
export class TherapistController {
  constructor(
    private readonly therapistService: TherapistService,
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService
  ) {}

  @Get('me')
  @UseGuards(TherapistJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    return await this.therapistService.findOne(user.id,queryParams);
  }


    @ApiFindAllQueryParams()
    @Get('me/chats')
    @UseGuards(TherapistJwtAuthGuard)
    async findMyChats(
      @CurrentUser() _: TokenPayload,
      @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
    ) {
      return this.chatService.findAll(queryParams);
    }
  
    @ApiFindOneQueryParams()
    @Get('me/chats/:id')
    @UseGuards(TherapistJwtAuthGuard)
    async findOneChat(
      @CurrentUser() _: TokenPayload,
      @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
      @Param('id') id: string
    ) {
      return this.chatService.findOne(id, queryParams);
    }

  @ApiFindAllQueryParams()
  @Get('me/sessions')
  @UseGuards(TherapistJwtAuthGuard)
  async findMySession(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.sessionService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/sessions/:id')
  @UseGuards(TherapistJwtAuthGuard)
  async findOneSession(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.sessionService.findOne(id, queryParams);
  }

  
  
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),  
    new ClientJwtAuthGuard()  
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
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
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
    description: 'Target folder: licence, profile etc.',
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
    @CurrentUser() token: TokenPayload,
    @UploadedFile() file: Express.Multer.File,
    @ValidatedFolder() folder: ValidFolders,
  ) {
    if (folder === ValidFolders.PROFILE) {
      const finalFileName = await this.therapistService.uploadProfile(token, file.filename);
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
