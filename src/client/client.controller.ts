import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { FILE_UPLOAD_KEY, TokenPayload, ValidFolders } from 'src/common/constants';
import { AuthEnforcedQueryParams, GroupScope } from 'src/common/decorators/auth-enforced-query-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ValidatedFolder } from 'src/common/decorators/valid-folder.decorator';
import { StatusDto } from 'src/common/dto/status.dto';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { DiaryService } from 'src/diary/diary.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MatchService } from 'src/match/match.service';
import { MoodService } from 'src/mood/mood.service';
import { SessionService } from 'src/session/session.service';
import { ClientService } from './client.service';
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
  ) {}

  @Get('me')
  @UseGuards(ClientJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    console.log("user - client.controller.ts:40", user);
    return await this.clientService.findOne(user.id,queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/chats')
  @UseGuards(ClientJwtAuthGuard)
  async findMyChats(
    @CurrentUser() client: TokenPayload,
    @GroupScope() _gs: boolean,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.chatService.findAll(queryParams,client );
  }

  @ApiFindOneQueryParams()
  @Get('me/chats/:id')
  @UseGuards(ClientJwtAuthGuard)
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
    @GroupScope() _gs: boolean,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.firebaseService.findAll(queryParams);
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
  @UseGuards(ClientJwtAuthGuard)
  async findMySession(
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
    enum: [ValidFolders.PROFILE],
    required: true,
    description: 'Target folder: profile.',
  })
  @ApiBody({
    description: 'File to upload. Folder comes from URL.',
    schema: {
      type: 'object',
      properties: {
        [FILE_UPLOAD_KEY]: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
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
