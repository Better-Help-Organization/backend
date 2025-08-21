import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { CreateMessageDto } from '../session/dto/message/create-message.dto';
import { ChatService } from './chat.service';
import { AddToChatDto } from './dto/add-chat.dto';
import { CreateChatDto } from './dto/create-chat.dto';


class RoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  room: string;
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly logger: LoggerService,
    
  ) {}

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @Post()
  async create(
    @CurrentUser() user:TokenPayload, 
    @Body() createChatDto: CreateChatDto) {
       return this.chatService.create(user.id, createChatDto);  
  }

  @Post(":chatId/add-to-chat")
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  addToSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: TokenPayload,
    @Body() addToSession: AddToChatDto
  ) {
    return this.chatService.addToChat(sessionId, addToSession);
  }

  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  @ApiFindAllQueryParams()
  @Get()
  async findAll(
    @Query() queryParams,
  ) {
    return this.chatService.findAll(queryParams);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  async findOne(
    @Query() queryParams,
    @Param('id') id: string
  ) {
   try{
    return await this.chatService.findOne(id, queryParams);
  } catch (error) {
    this.logger.error(`Error finding chat: ${error.message}`);
    return error;
  }
  }

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @ApiFindOneQueryParams()
  @Get(':chatId/messages/:id')
  async getOneMessage(
    @Query() queryParams,
    @Param('chatId') chatId: string,
    @Param('id') id: string
  ) {
   try{
    const chat = this.chatService.getOneMessage(chatId, id, queryParams);
    
    if (!chat) throw new NotFoundException('message not found');
    return chat;
    } 
  catch (error) {
    // this.logger.error(`Error finding chat: ${error.message}`);
    return error;
    }
  }

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @Post(':chatId/messages')
  async createOneMessage(
    @CurrentUser() sender:TokenPayload,
    @Param('chatId') chatId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
   try{
    await this.chatService.createOneMessage(chatId, sender,createMessageDto);
  }
  catch (error) {
    this.logger.error(`Error sending message: ${error.message}`);
    return error;
    }
  }

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @Patch(':chatId/read')
  async markAsRead(
    @Param('chatId') chatId: string,
    @CurrentUser() token: TokenPayload,
  ) {
    return this.chatService.markMessagesAsRead(chatId, token);
  }

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @ApiFindAllQueryParams()
  @Get(':id/messages')
  async getMessages(
    @Query() queryParams,
    @Param('id') id: string
  ) {
   try{
    return await this.chatService.getMessages(id, queryParams);
  } catch (error) {
    // this.logger.error(`Error finding booking: ${error.message}`);
    return error;
  }
  }

  @Post('call/:id')
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  async call(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
    @Body() roomDto: RoomDto
  ) {
   try{
    return await this.chatService.call(id,user, roomDto.room);
  } catch (error) {
    this.logger.error(`Error finding chat: ${error.message}`);
    return error;
  }
  }

  @Post('call/end/:id')
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  async endCall(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ) {
    try {
      return await this.chatService.endCall(id, user);
    } catch (error) {
      this.logger.error(`Error ending call: ${error.message}`);
      return error;
    }
  }

  @Post('call/reject/:id')
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  async rejectCall(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ) {
    try {
      return await this.chatService.rejectCall(id, user);
    } catch (error) {
      this.logger.error(`Error rejecting call: ${error.message}`);
      return error;
    }
  }

  // @Patch(':id')
  // async update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
  //   return this.chatService.update(id, updateChatDto);
  // }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.chatService.remove(id);
  }
}
