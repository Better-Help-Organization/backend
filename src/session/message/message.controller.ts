import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateMessageDto } from '../dto/message/create-message.dto';
import { MessageService } from './message.service';
// import { CreateDto } from './dto/create-.dto';
// import { UpdateDto } from './dto/update-.dto';

@Controller('messages')
export class MessageController {
  
  constructor(
    private readonly messageService: MessageService
  ) {}

  @Post(':sessionId')
  @DynamicGuards(
    new TherapistJwtAuthGuard()
  )
  async create(
    @Param('sessionId') sessionId: string,
    @Body() createDto: CreateMessageDto,
    @CurrentUser() sender: TokenPayload
  ) {
    return await this.messageService.createOneMessage(sessionId,sender,createDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messageService.findOne(id);
  }

  @Get(':sessionId')
  @ApiFindAllQueryParams()
  findAllBySession(
    @Param('sessionId') sessionId: string,
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.messageService.findAllBySession(sessionId, queryparams);
  }

  @Get()
  findAll() {
    return this.messageService.findAll();
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
  //   return this.messageService.update(+id, updateDto);
  // }

  @DynamicGuards(
  new ClientJwtAuthGuard(),
  new TherapistJwtAuthGuard(),
  )
  @Delete(':id')
  remove(
    @CurrentUser() sender:TokenPayload,
    @Param('id') id: string) {
    return this.messageService.remove(id, sender);
  }
}
