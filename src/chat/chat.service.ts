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
import { Not, Repository } from 'typeorm';
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
  async create(id: string, createChatDto: CreateChatDto) {
  this.logger.log('Creating a new chat');
  try {
    const therapist = await this.therapistService.findOne(id);

    let clients = [];
    if (createChatDto.client) {
      // 1-on-1 chat
      const client = await this.clientService.findOne(createChatDto.client);
      clients = [client];
    } else if (createChatDto.groupClients?.length) {
      // Group chat
      const group = await this.clientService.findAll({ ids: createChatDto.groupClients.join(',') });
      clients = group.data;
    }

    const newChat = this.chatRepo.create({
      ...createChatDto,
      client: createChatDto.client ? clients[0] : null,
      therapist,
      group: createChatDto.client ? null : clients,
    });

    const savedChat = await this.chatRepo.save(newChat);

    // Collect tokens
    const tokens = [
      ...clients.map(c => c.firebaseToken).filter(Boolean),
      therapist.firebaseToken
    ];

    this.firebaseService.sendPushNotification(
      tokens,
      `You have been added to a ${createChatDto.client ? 'chat' : 'group chat'}`,
      SessionNotif.CHAT,
      `You have been added to a ${createChatDto.client ? 'chat' : 'group chat'}`
    );

    this.logger.log('Chat created successfully');
    return savedChat;
  } catch (error) {
    this.logger.error(`Error creating chat: ${error.message}`);
    throw error;
  }
}

    // async create(id:string, createChatDto: CreateChatDto) {
    //   this.logger.log('Creating a new chat');
    //   try {
    //     let clientEntity = null;
    //     let groupEntities = null;
    //     if(createChatDto.client) {
    //       clientEntity = await this.clientService.findOne(createChatDto.client);
    //   }
    //       console.log(createChatDto.groupClients)
    //     if(createChatDto.groupClients && createChatDto.groupClients.length !== 0) {
    //       groupEntities = await this.clientService.findAll({ids: `${createChatDto.groupClients.join(',')}`});
    //       console.log('Group entities: - chat.service.ts:43', groupEntities);
    //     }
    //     console.log({groupEntities})
    //     const therapistEntity = await this.therapistService.findOne(id);
  
    //     const newChat = this.chatRepo.create({
    //       ...createChatDto,
    //       client: clientEntity,
    //       therapist: therapistEntity,
    //       group: groupEntities ? groupEntities?.data : null,
    //     });
  
    //     const savedChat = await this.chatRepo.save(newChat);
        
    //     const tokens: string[] = []
    //     let clientToken: string[] = []
    //     if (createChatDto.client != null) {
    //       const client = await this.clientService.findOne(createChatDto.client)
    //       console.log('Client token: - chat.service.ts:61', client); 
    //       clientToken.push(client.firebaseToken);     
    //     }
    //     else {
    //       const clients = (await this.clientService.findAll({ids: `${createChatDto.groupClients.join(',')}`}))
    //       clientToken.push(clients.data.map(c => {
    //         console.log(c.firebaseToken,'cht-ser 67')
    //         return c.firebaseToken
    //       }));
    //       console.log({clients}, 'chat.service.ts:70')
    //       console.log('Group client tokens: - chat.service.ts:71', ...clientToken);
    //     }
  
    //     const therapistToken = await this.therapistService.findOne(id)
    //     console.log('Therapist token: - chat.service.ts:75', therapistToken.firebaseToken);
    //     tokens.push(...clientToken, therapistToken.firebaseToken);
    //     console.log(tokens)
    //     console.log(tokens.length)
    //     this.firebaseService.sendPushNotification(
    //       tokens,
    //       `You have been added to a group chat`,
    //       SessionNotif.SCHEDULED,
    //       `You have been added to a group chat`
    //     );
    
    //     this.logger.log('chat created successfully');
    //     return savedChat;
    //   } catch (error) {
    //     this.logger.error(`Error creating chat: ${error.message}`);
    //     throw error;
    //   }
    // }

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

  async createOneMessage(chatId: string, sender: TokenPayload, createMessageDto: CreateMessageDto) {
  try {
    let client = null;
    let therapist = null;

    if (sender.type === UserTypes.CLIENT) client = sender.id;
    if (sender.type === UserTypes.THERAPIST) therapist = sender.id;

    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*,group.*" });

    const { content } = createMessageDto;
    const msg = await chat.addMessage(this.msgRepo, content, therapist, client, this.chatRepo);

    if (!msg) throw new BadRequestException("Unable to send message");

    // Build list of firebase tokens for all recipients except sender
    let tokens: string[] = [];

    if (chat.group?.length) {
      // Group chat: send to all group clients except sender
      tokens = chat.group
        .filter(c => c.id !== sender.id)
        .map(c => c.firebaseToken)
        .filter(Boolean);
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        console.log(chat.therapist.firebaseToken, "osdmksmdflsmdlsmdlkdsf")
        tokens.push(chat.therapist.firebaseToken);
      }

    } else {
      // One-to-one chat
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        tokens.push(chat.therapist.firebaseToken);
      }
      if (sender.type === UserTypes.THERAPIST && chat.client?.firebaseToken) {
        tokens.push(chat.client.firebaseToken);
      }
    }

    if (tokens.length > 0) {
      await this.firebaseService.sendPushNotification(tokens, JSON.stringify(msg), SessionNotif.NEW_MESSAGE, content);
    }

  } catch (error) {
    this.logger.error(`Error sending message: ${error.message}`);
    throw error;
  }
}

  // async createOneMessage(chatId: string, sender: TokenPayload, createMessageDto: CreateMessageDto){
  //   try {
  //     let client = null
  //     let therapist = null

  //     if (sender.type === UserTypes.CLIENT) client = sender.id 
  //     if (sender.type === UserTypes.THERAPIST) therapist = sender.id
      
  //     const chat = await this.findOne(chatId,{fields:"client.*,therapist.*"})

  //     const { content  } = createMessageDto
  //     const msg = await chat.addMessage(this.msgRepo,content,therapist,client, this.chatRepo)

  //     if(msg) {
  //       let token: string[] = []
  //       if (sender.type === UserTypes.CLIENT) token.push(chat.therapist.firebaseToken)
  //       if( sender.type === UserTypes.THERAPIST) token.push(chat.client.firebaseToken)

  //       await this.firebaseService.sendPushNotification(token, JSON.stringify(msg), SessionNotif.NEW_MESSAGE, content)
  //     }
  //     else {
  //       throw new BadRequestException("Unable to send message")
  //     }

  //   } catch (error) {
  //     this.logger.error(`Error finding all message: ${error.message}`);
  //     return error;
  //   }
  // }

  async editOneMessage(chatId: string, id: string, sender: TokenPayload, updateMessageDto: UpdateMessageDto) {
  try {
    let client = null;
    let therapist = null;

    if (sender.type === UserTypes.CLIENT) client = sender.id;
    if (sender.type === UserTypes.THERAPIST) therapist = sender.id;

    const { content } = updateMessageDto;
    const msg = await this.msgRepo.findOne({
      where: { id },
      relations: ["client", "therapist", "chat", "chat.group"]
    });

    if (!msg) throw new NotFoundException("Message Not Found");

    // Check sender owns the message
    if ((msg.client?.id && msg.client.id !== client) && (msg.therapist?.id && msg.therapist.id !== therapist)) {
      throw new MethodNotAllowedException("You can't edit this message");
    }

    const chat = await this.findOne(chatId, { fields: "client.*, therapist.*, group.*" });
    const editedMsg = await chat.editMessage(this.msgRepo, id, content);

    if (!editedMsg) throw new BadRequestException("Error while editing the message");

    // Build token list for notifications
    let tokens: string[] = [];

    if (chat.group?.length) {
      tokens = chat.group
        .filter(c => c.id !== sender.id)
        .map(c => c.firebaseToken)
        .filter(Boolean);
    } else {
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        tokens.push(chat.therapist.firebaseToken);
      }
      if (sender.type === UserTypes.THERAPIST && chat.client?.firebaseToken) {
        tokens.push(chat.client.firebaseToken);
      }
    }

    if (tokens.length > 0) {
      await this.firebaseService.sendPushNotification(tokens, JSON.stringify(editedMsg), SessionNotif.EDIT_MESSAGE, content);
    }

  } catch (error) {
    throw error;
  }
}

  // async editOneMessage(chatId: string, id: string, sender: TokenPayload, updateMessageDto: UpdateMessageDto){
  //   try {
  //     let client = null
  //     let therapist = null
  //     if (sender.type == UserTypes.CLIENT) client = sender.type 
  //     if (sender.type == UserTypes.THERAPIST) therapist = sender.type
  //     // console.log({client, therapist, id})
  //     const { content } = updateMessageDto
  //     const msg = await  this.msgRepo.findOne({
  //       where: {id},
  //       relations:["client","therapist"]
  //     });

  //   if(!msg) throw new NotFoundException("Message Not Found")

  //   if (msg.client.id !== client ||  msg.therapist.id !== therapist)
  //     throw new MethodNotAllowedException("You can't edit a message in this chat")
      
  //   const chat = await this.findOne(chatId, {fields:"client.firebaseToken, therapist.firebaseToken"})
  //   const editedMsg = await chat.editMessage(this.msgRepo,id,content)

  //   console.log({chat})
  //   console.log({editedMsg})

  //   if(editedMsg) {
  //       let token: string[] = []
  //     if (sender.type == UserTypes.THERAPIST) token.push(chat.therapist.firebaseToken)
      
  //     if( sender.type == UserTypes.CLIENT) token.push(chat.client.firebaseToken)

  //     await this.firebaseService.sendPushNotification(token, JSON.stringify(editedMsg), SessionNotif.EDIT_MESSAGE, content)
      
  //   }
  //   else {
  //     throw new BadRequestException("Error while editing the message")
  //   }
  //   } catch (error) {
  //     throw  error;
  //   }
  // }

  async markMessagesAsRead(chatId: string, user: TokenPayload) {
    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*" });
    if (!chat) throw new NotFoundException('Chat not found');

    const isClient = user.type === UserTypes.CLIENT && chat.client?.id === user.id;
    const isTherapist = user.type === UserTypes.THERAPIST && chat.therapist?.id === user.id;
    if (!isClient && !isTherapist) {
      throw new BadRequestException('You are not a participant of this chat');
    }

    const qb = this.msgRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true })
      .where('chatId = :chatId', { chatId })
      .andWhere('isRead = false');

    if (isClient) {
      qb.andWhere('therapistId IS NOT NULL');
    } else {
      qb.andWhere('clientId IS NOT NULL');
    }

    const result = await qb.execute();

    if (!result.affected || result.affected === 0) {
      return { success: true, message: 'No unread messages' };
    }

    const readBy = { [user.type.toLowerCase()]: user.id };

    const recipientToken = isClient ? chat.therapist?.firebaseToken : chat.client?.firebaseToken;
    if (recipientToken) {
      await this.firebaseService.sendPushNotification(
        [recipientToken],
        JSON.stringify({ chatId, readBy, count: result.affected }),
        SessionNotif.MESSAGE_READ,
        `Messages marked as read in chat ${chatId}`
      );
    }

    return { success: true, affected: result.affected };
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

    await this.firebaseService.sendPushNotification([recipient.firebaseToken], JSON.stringify({ room, callerData, chatId: id }), SessionNotif.INCOMING_CALL, `Incoming call from ${callerData.firstName}`)

    return chat;
    } catch (error) {
      this.logger.error(`Error finding chat for call: ${error.message}`);
      throw error;
    }
  }

  async endCall(chatId: string, caller: TokenPayload) {
    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*" });
    const isCallerClient = chat.client.id === caller.id;

    const recipient = isCallerClient ? chat.therapist : chat.client;
    const callerData = isCallerClient ? chat.client : chat.therapist;

    await this.firebaseService.sendPushNotification(
      [recipient.firebaseToken],
      JSON.stringify({ chatId, callerData }),
      SessionNotif.CALL_ENDED,
      `Call ended by ${callerData.firstName}`
    );

    return { success: true, status: 'ended' };
  }

  async rejectCall(chatId: string, caller: TokenPayload) {
    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*" });
    const isCallerClient = chat.client.id === caller.id;

    const recipient = isCallerClient ? chat.therapist : chat.client;
    const callerData = isCallerClient ? chat.client : chat.therapist;

    await this.firebaseService.sendPushNotification(
      [recipient.firebaseToken],
      JSON.stringify({ chatId, callerData }),
      SessionNotif.CALL_REJECTED,
      `Call rejected by ${callerData.firstName}`
    );

    return { success: true, status: 'rejected' };
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
