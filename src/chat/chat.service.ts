import { BadRequestException, Injectable, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionNotif, TokenPayload, UserTypes } from 'src/common/constants';
import { Chat } from 'src/common/entities/chat.entity';
import { Message } from 'src/common/entities/message.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateMessageDto } from '../session/dto/message/create-message.dto';
import { UpdateMessageDto } from '../session/dto/message/update-message.dto';
import { CreateChatDto } from './dto/create-chat.dto';



@Injectable()
export class ChatService {
    
  constructor(
    @InjectRepository(Chat) private  chatRepo:Repository<Chat>,
    @InjectRepository(Message) private  msgRepo:Repository<Message>,
    private readonly firebaseService: FirebaseService,
    private readonly logger: LoggerService,

  ) {}
  async create(createChatDto: CreateChatDto) {
    const {client, therapist} = createChatDto
    let chat = this.chatRepo.create({
      client: { id: client } ,
      therapist: { id: therapist },
    });

    chat = await this.chatRepo.save(chat);

    return chat;
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.chatRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Error finding all chats: ${error.message}`);
      return error;
    }
  }

  async getMessages(id: string, queryParams?: FindAllQueryParams){
    try {
      return await new APIFeatures(this.msgRepo, {...queryParams, filters:`chat=${id}`}).getMany();
    } catch (error) {
      this.logger.error(`Error finding all chats: ${error.message}`);
      return error;
    }
  }

  async getOneMessage(chatId: string, id: string, queryParams?: FindOneQueryParams){
    try {
      return await new APIFeatures(this.msgRepo, {...queryParams, filters:`chat=${chatId}, id=${id}`}).getMany();
    } catch (error) {
      this.logger.error(`Error finding one chats: ${error.message}`);
      return error;
    }
  }

  async createOneMessage(chatId: string, sender: TokenPayload, createMessageDto: CreateMessageDto){
    try {
      let client = null
      let therapist = null

      if (sender.type === UserTypes.CLIENT) client = sender.type 
      if (sender.type === UserTypes.THERAPIST) therapist = sender.type
      
      const chat = await this.findOne(chatId,{fields:"client.*,therapist.*"})

      const { content  } = createMessageDto
      const msg = await chat.addMessage(this.msgRepo,content,therapist,client)

      // if(msg) {
      //   let token = ''
      //   if (sender.type === UserTypes.CLIENT) token = chat.client.firebaseToken
      //   if( sender.type === UserTypes.THERAPIST) token = chat.therapist.firebaseToken

      //   await this.firebaseService.sendPushNotification([token], JSON.stringify(msg), SessionNotif.NEW_MESSAGE)
      // }
      // else {
      //   throw new BadRequestException("Unable to send message")
      // }

    } catch (error) {
      this.logger.error(`Error finding all message: ${error.message}`);
      return error;
    }
  }

  async editOneMessage(chatId: string, id: string, sender: TokenPayload, updateMessageDto: UpdateMessageDto){
    try {
      let client = null
      let therapist = null
      if (sender.type = UserTypes.CLIENT) client = sender.type 
      if (sender.type = UserTypes.THERAPIST) therapist = sender.type
      // console.log({client, therapist, id})
      const { content } = updateMessageDto
      const msg = await  this.msgRepo.findOne({
        where: {id},
        relations:["client","therapist"]
      });
      console.log({msg})
      console.log(msg.client !== client)
      console.log(msg.therapist !== therapist)
      // console.log({message})

    if(!msg) throw new NotFoundException("Message Not Found")

    if (msg.client.id !== client ||  msg.therapist.id !== therapist)
      throw new MethodNotAllowedException("You can't edit a message in this chat")
      
    const chat = await this.findOne(chatId, {fields:"client.firebaseToken, therapist.firebaseToken"})
    const editedMsg = await chat.editMessage(this.msgRepo,id,content)

    console.log({chat})
    console.log({editedMsg})

    if(editedMsg) {
      let token = ''
      if (sender.type = UserTypes.THERAPIST) token = chat.therapist.firebaseToken
      
      if( sender.type = UserTypes.CLIENT) token = chat.client.firebaseToken

      await this.firebaseService.sendPushNotification([token], editedMsg.toString(), SessionNotif.EDIT_MESSAGE)
      
    }
    else {
      throw new BadRequestException("Error while editing the message")
    }
    } catch (error) {
      throw  error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Chat> {
  try {
    console.log({id, queryParams})
      const chat = await new APIFeatures(this.chatRepo, queryParams).getOne(id);
      if (!chat) throw new NotFoundException('Chat not found');
      return chat
    } catch (error) {
      this.logger.error(`Error finding chat: ${error.message}`);
      throw error;
    }
  }

  // update(id: string, updateChatDto: UpdateChatDto) {
  //   return `This action updates a #${id} chat`;
  // }

  async remove(id: string) {
    try {
      return await this.chatRepo.delete(id);
    } catch (error) {
      this.logger.error(`Error removing chat: ${error.message}`);
      return error;
    }
  }

  async call(id: string, caller: TokenPayload, room: string) {
    try {

    const chat = await this.findOne(id, {fields:"client.*,therapist.*"});
    const isCallerClient = chat.client.id === caller.id;
    const recipient = isCallerClient ? chat.therapist : chat.client;
      
    await this.firebaseService.sendPushNotification([recipient.firebaseToken], room, SessionNotif.INCOMING_CALL)

    return chat;
    } catch (error) {
      this.logger.error(`Error finding chat for call: ${error.message}`);
      throw error;
    }
  }
}
