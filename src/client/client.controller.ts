import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { FILE_UPLOAD_KEY, TokenPayload, UserTypes, ValidFolders } from 'src/common/constants';
import { AllowAdminAccess } from 'src/common/decorators/allow-admin-acess';
import { AuthEnforcedQueryParams, GroupScope } from 'src/common/decorators/auth-enforced-query-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ValidatedFolder } from 'src/common/decorators/valid-folder.decorator';
import { StatusDto } from 'src/common/dto/status.dto';
import { GroupScopeGuard } from 'src/common/guard/group-scope,guard';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
import { ApiFilterByDate, ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { DiaryService } from 'src/diary/diary.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MatchService } from 'src/match/match.service';
import { MoodService } from 'src/mood/mood.service';
import { PreferenceService } from 'src/preference/preference.service';
import { SessionService } from 'src/session/session.service';
import { ClientService } from './client.service';
import { ClientStatisticsService } from './client.stats';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('client')
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
    private readonly moodService: MoodService,
    private readonly matchService: MatchService,
    private readonly firebaseService: FirebaseService,
    private readonly diaryService: DiaryService,
    private readonly stats: ClientStatisticsService,
    private readonly prefService: PreferenceService,
  ) {}

  @Get('me')
  @UseGuards(ClientJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    return await this.clientService.findOne(user.id,queryParams);
  }

  @Get('stats')
  @ApiFilterByDate()
  @ApiQuery({ 
    name: 'mockId', 
    required: false, 
    type: String, 
  })
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  async statistics(
    @AllowAdminAccess(UserTypes.CLIENT) client: TokenPayload,
    @Query('mockId') mockId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stats.getClientAnalytics(client.id, startDate, endDate)
  }

  @ApiFindAllQueryParams()
  @Get('me/chats')
  @UseGuards(ClientJwtAuthGuard, GroupScopeGuard)
  async findMyChats(
    @GroupScope() _gs: boolean,
    @CurrentUser() client: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.chatService.findAll(queryParams,client );
  }

  @ApiFindOneQueryParams()
  @Get('me/chats/:id')
  @UseGuards(ClientJwtAuthGuard, GroupScopeGuard)
  async findOneChat(
    @CurrentUser() _: TokenPayload,
    @GroupScope() _gs: boolean,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.chatService.findOne(id, queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/notifications')
  @UseGuards(ClientJwtAuthGuard)
  async findMyNotifications(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.firebaseService.findAll(queryParams, _);
  }

  @ApiFindAllQueryParams()
  @Post('me/notifications/read')
  @UseGuards(ClientJwtAuthGuard)
  async readMyNotifications(
    @CurrentUser() _: TokenPayload,
  @Query() queryParams,
  ) {
    return this.firebaseService.markAsRead(queryParams);
  }


  @ApiFindAllQueryParams()
  @Get('me/preferences')
  @UseGuards(ClientJwtAuthGuard)
  async findMyPreferences(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.prefService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/notifications/:id')
  @UseGuards(ClientJwtAuthGuard)
  async findOneNotification(
    @CurrentUser() _: TokenPayload,
    @GroupScope() _gs: boolean,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.firebaseService.findOne(id, queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/matches')
  @UseGuards(ClientJwtAuthGuard)
  async findMyMatches(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.matchService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/matches/:id')
  @UseGuards(ClientJwtAuthGuard)
  async findOneMatch(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.matchService.findOne(id, queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/sessions')
  @UseGuards(ClientJwtAuthGuard, GroupScopeGuard)
  async findMySession(
    @GroupScope() _gs: boolean,
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.sessionService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/sessions/:id')
  @UseGuards(ClientJwtAuthGuard)
  async findOneSession(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.sessionService.findOne(id, queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/moods')
  @UseGuards(ClientJwtAuthGuard)
  async findMood(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.moodService.findAll(queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/diary')
  @UseGuards(ClientJwtAuthGuard)
  async findDiary(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.diaryService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/diary/:id')
  @UseGuards(ClientJwtAuthGuard)
  async findOneDiary(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.diaryService.findOne(id, queryParams);
  }

  @Get()
  @ApiFindAllQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.clientService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.clientService.findOne(id, queryParams);
  }

  @Patch('me')
  @DynamicGuards(
    new ClientJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateClientDto: UpdateClientDto ) {
    return this.clientService.update(user.id, updateClientDto);
  }

  @Patch(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientService.update(id, updateClientDto);
  }

  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }

  @Post('me/upload/:folder')
  @UseGuards(ClientJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'folder',
    enum: [ValidFolders.PROFILE, ValidFolders.PAYMENT],
    required: true,
    description: 'Target folder: profile, payment.',
  })
  @ApiQuery({
    name: 'subscriptionId',
    type: 'string',
    required: false,
    description:
      'Required when folder is "payment". Associates the uploaded payment with a specific subscription.',
    example: '4be8f40a-123b-4e0a-b3f2-7767c64a88a6',
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
      const finalFileName = await this.clientService.uploadProfile(token, file.filename);
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

  @UseGuards(AdminJwtAuthGuard)
  @Patch('/toggleStatus/:id')
  toggleStatus(@Param('id') id: string, @Body() statusDto: StatusDto ){
    return this.clientService.toggleStatus(id, statusDto)
  }
}
