import { BadRequestException, Injectable, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { SessionNotif, TokenPayload, UserTypes } from 'src/common/constants';
import { Chat } from 'src/common/entities/chat.entity';
import { Message } from 'src/common/entities/message.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Repository } from 'typeorm';
import { CreateMessageDto } from '../session/dto/message/create-message.dto';
import { UpdateMessageDto } from '../session/dto/message/update-message.dto';
import { AddToChatDto } from './dto/add-chat.dto';
import { CreateChatDto } from './dto/create-chat.dto';



@Injectable()
export class ChatService {
    
  constructor(
    @InjectRepository(Chat) private  chatRepo:Repository<Chat>,
    @InjectRepository(Message) private  msgRepo:Repository<Message>,
    private readonly firebaseService: FirebaseService,
    private readonly logger: LoggerService,  
    private readonly clientService: ClientService,  
    private readonly therapistService: TherapistService,  

  ) {}
    async create(id:string, createChatDto: CreateChatDto) {
      this.logger.log('Creating a new chat');
      try {
        let clientEntity = null;
        let groupEntities = null;
        if(createChatDto.client) {
          clientEntity = await this.clientService.findOne(createChatDto.client);
      }
          console.log(createChatDto.groupClients)
        if(createChatDto.groupClients && createChatDto.groupClients.length !== 0) {
          groupEntities = await this.clientService.findAll({ids: `${createChatDto.groupClients.join(',')}`});
          console.log('Group entities: - chat.service.ts:43', groupEntities);
        }
        console.log({groupEntities})
        const therapistEntity = await this.therapistService.findOne(id);
  
        const newSession = this.chatRepo.create({
          ...createChatDto,
          client: clientEntity,
          therapist: therapistEntity,
          group: groupEntities ? groupEntities?.data : null,
        });
  
        const savedSession = await this.chatRepo.save(newSession);
        
        const tokens: string[] = []
        let clientToken: string[] = []
        if (createChatDto.client != null) {
          const client = await this.clientService.findOne(createChatDto.client)
          console.log('Client token: - chat.service.ts:60', client); 
          clientToken.push(client.firebaseToken);     
        }
        else {
          const clients = (await this.clientService.findAll({ids: `${createChatDto.groupClients.join(',')}`}))
          clientToken.push(clients.data.map(c => c.firebaseToken));
          console.log('Group client tokens: - chat.service.ts:66', ...clientToken);
        }
  
        const therapistToken = await this.therapistService.findOne(id)
        console.log('Therapist token: - chat.service.ts:70', therapistToken.firebaseToken);
        tokens.push(...clientToken, therapistToken.firebaseToken);
  
        this.firebaseService.sendPushNotification(
          tokens,
          `You have has been added to a group chat`,
          SessionNotif.SCHEDULED
        );
    
        this.logger.log('Session created successfully');
        return savedSession;
      } catch (error) {
        this.logger.error(`Error creating chat: ${error.message}`);
        throw error;
      }
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
      return await new APIFeatures(this.msgRepo, {...queryParams}).getMany();
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

      if (sender.type === UserTypes.CLIENT) client = sender.id 
      if (sender.type === UserTypes.THERAPIST) therapist = sender.id
      
      const chat = await this.findOne(chatId,{fields:"client.*,therapist.*"})

      const { content  } = createMessageDto
      const msg = await chat.addMessage(this.msgRepo,content,therapist,client)

      if(msg) {
        let token = ''
        if (sender.type === UserTypes.CLIENT) token = chat.therapist.firebaseToken
        if( sender.type === UserTypes.THERAPIST) token = chat.client.firebaseToken

        await this.firebaseService.sendPushNotification([token], JSON.stringify(msg), SessionNotif.NEW_MESSAGE)
      }
      else {
        throw new BadRequestException("Unable to send message")
      }

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
    const callerData = isCallerClient ? chat.client : chat.therapist ;

    await this.firebaseService.sendPushNotification([recipient.firebaseToken], JSON.stringify({ room, callerData }), SessionNotif.INCOMING_CALL)

    return chat;
    } catch (error) {
      this.logger.error(`Error finding chat for call: ${error.message}`);
      throw error;
    }
  }

  async addToChat(sessionId: string, dto: AddToChatDto) {
      const { groupClients } = dto;
  
      const chat = await this.findOne(sessionId, { fields: 'client.*, group.*, therapist.*' });
  
      if(chat.client != null) {
        throw new BadRequestException('Cannot add clients to a 1-on-1 chat');
      }
  
      const existingClientIds = chat.group.map(c => c.id);
  
      // Fetch all clients to be added
      const clientsToAdd = await this.clientService.findAll({ids: `${groupClients.join(',')}`});
  
      const newClients = clientsToAdd.data.filter(c => !existingClientIds.includes(c.id));
  
      if (newClients.length === 0) {
        throw new BadRequestException('All clients are already part of the chat');
      }
  
      chat.group = [...chat.group, ...newClients];
      console.log(chat.group)
      return await this.chatRepo.save(chat);
    }
}
