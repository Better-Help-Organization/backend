import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ChatService } from 'src/chat/chat.service';
import { TokenPayload } from 'src/common/constants';
import { AuthEnforcedQueryParams } from 'src/common/decorators/auth-enforced-query-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { ClientService } from './client.service';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('client')
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly chatService: ChatService
  ) {}

  @Get('me')
  @UseGuards(ClientJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    console.log("user - client.controller.ts:26", user);
    return await this.clientService.findOne(user.id,queryParams);
  }

  @ApiFindAllQueryParams()
  @Get('me/chats')
  @UseGuards(ClientJwtAuthGuard)
  async findMyChats(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
  ) {
    return this.chatService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get('me/chats/:id')
  @UseGuards(ClientJwtAuthGuard)
  async findOneChat(
    @CurrentUser() _: TokenPayload,
    @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
    @Param('id') id: string
  ) {
    return this.chatService.findOne(id, queryParams);
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
}
