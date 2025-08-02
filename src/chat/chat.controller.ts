import { Body, Controller, Delete, Get, MethodNotAllowedException, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindOnePathParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { CreateMessageDto } from '../session/dto/message/create-message.dto';
import { ChatService } from './chat.service';
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
    @CurrentUser() token:TokenPayload, 
    @Body() createChatDto: CreateChatDto) {
    // const booking = await this.bookingService.findOne(createChatDto.bookingId,{fields:"driver.*,user.*"})
    // if (booking.driver.id && booking.user.id)
    //   if (token.userId === booking.driver.id || token.userId === booking.user.id)
       return this.chatService.create(createChatDto);
    
    throw new MethodNotAllowedException("You can't start a conversation for this booking")
  
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
    // this.logger.error(`Error finding booking: ${error.message}`);
    return error;
    }
  }

  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @Post(':id/messages')
  async createOneMessage(
    @CurrentUser() sender:TokenPayload,
    @Param() {id}: FindOnePathParams,
    @Body() createMessageDto: CreateMessageDto,
  ) {
   try{
    await this.chatService.createOneMessage(id, sender,createMessageDto);
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
  @ApiFindOneQueryParams()
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

  @ApiFindOneQueryParams()
  @Get(':id')
  async findOne(
    @Query() queryParams,
    @Param('id') id: string
  ) {
   try{
    return await this.chatService.findOne(id, queryParams);
  } catch (error) {
    // this.logger.error(`Error finding booking: ${error.message}`);
    return error;
  }
  }

  @Post(':id/call')
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
    // this.logger.error(`Error finding booking: ${error.message}`);
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
