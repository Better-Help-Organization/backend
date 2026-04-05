import { BadRequestException, Injectable, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { SessionNotif, TokenPayload, Tokens, UserTypes } from 'src/common/constants';
import { Chat } from 'src/common/entities/chat.entity';
import { Client } from 'src/common/entities/client.entity';
import { Message } from 'src/common/entities/message.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LivekitService } from 'src/livekit/livekit.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Repository } from 'typeorm';
import { CreateMessageDto } from '../session/dto/message/create-message.dto';
import { UpdateMessageDto } from '../session/dto/message/update-message.dto';
import { AddToChatDto } from './dto/add-chat.dto';
import { CreateCallDto } from './dto/create-call.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { ToggleChatDto } from './dto/toggle-chat.dto';

@Injectable()
export class ChatService {
    
  constructor(
    @InjectRepository(Chat) private  chatRepo:Repository<Chat>,
    @InjectRepository(Message) private  msgRepo:Repository<Message>,
    private readonly firebaseService: FirebaseService,
    private readonly logger: LoggerService,  
    private readonly clientService: ClientService,  
    private readonly therapistService: TherapistService,  
    private readonly livekitService: LivekitService,

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
      const tokens: Tokens = {
        client: [],
        therapist: [],
        admin: [],
      };
      // Collect tokens
      tokens.client = [...clients.map(c => c.firebaseToken).filter(Boolean)]
      tokens.therapist= [therapist?.firebaseToken]

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
    // Example for Chat entity
  async findMyChats(clientId: string) {
  // 🧩 Step 1: Fetch all chats (simple query, no grouping)
    const chats = await this.chatRepo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.group', 'group')
      .leftJoinAndSelect('chat.client', 'client')
      .leftJoinAndSelect('chat.therapist', 'therapist')
      .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
      .where(qb => {
        qb.where('client.id = :clientId', { clientId })
          .orWhere('group.id = :clientId', { clientId });
      })
      .orderBy('chat.updatedAt', 'DESC')
      .getMany();

    // 🧮 Step 2: Compute unread counts per chat (separate lightweight query)
    const unreadCounts = await this.chatRepo.manager
      .createQueryBuilder(Message, 'message')
      .select('message.chatId', 'chatId')
      .addSelect('COUNT(*)', 'unreadCount')
      .where('message.isRead = false')
      .andWhere('message.clientId != :clientId', { clientId })
      .groupBy('message.chatId')
      .getRawMany();

    // 🧠 Step 3: Merge counts into chats
    const unreadMap = Object.fromEntries(
      unreadCounts.map(u => [u.chatId, Number(u.unreadCount)])
    );

    return chats.map(chat => ({
      ...chat,
      unreadCount: unreadMap[chat.id] || 0,
    }));
  }

  async findAll(queryParams?: FindAllQueryParams, user?: TokenPayload) {
  try {
    // 1️⃣ Fetch chats without joining group members
    const chats = await new APIFeatures(this.chatRepo, queryParams).getMany();

    const chatIds = chats.data.map(c => c.id);
    if (!chatIds.length) return chats;

    // 2️⃣ Fetch group members for all chats in one query
    const groupMembers = await this.chatRepo
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.group', 'member')
      .where('chat.id IN (:...ids)', { ids: chatIds })
      .getMany();

    // 3️⃣ Create a map from chatId → members
    const groupMap = groupMembers.reduce<Record<string, Client[]>>((acc, chat) => {
      acc[chat.id] = chat.group || [];
      return acc;
    }, {});

    // 4️⃣ Attach members to original chat objects
    const dataWithMembers = chats.data.map(chat => ({
      ...chat,
      group: groupMap[chat.id] || [],
    }));

    // 5️⃣ Count unread messages
    const qb = this.msgRepo
      .createQueryBuilder('m')
      .select('m.chatId', 'chatId')
      .addSelect('COUNT(*)', 'unreadCount')
      .where('m.isRead = false')
      .andWhere('m.chatId IN (:...ids)', { ids: chatIds });

    if (user?.type === UserTypes.CLIENT) {
      qb.andWhere('m.therapistId IS NOT NULL');
    } else if (user?.type === UserTypes.THERAPIST) {
      qb.andWhere('m.clientId IS NOT NULL');
    }

    const counts = await qb.groupBy('m.chatId').getRawMany();
    const countsMap = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.chatId] = parseInt(row.unreadCount, 10);
      return acc;
    }, {});

    // 6️⃣ Attach unread counts
    const finalData = dataWithMembers.map(chat => ({
      ...chat,
      unreadCount: countsMap[chat.id] || 0,
    }));

    return { data: finalData, pagination: chats.pagination };
  } catch (error) {
    this.logger.error(`Error fetching chats and group members: ${error.message}`);
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
  private SENSITIVE_KEYS = [
    'password',
    'refreshToken',
    'firebaseToken',
    'OTP',
    'OTPExpires',
    'email',
    'phoneNumber',
    'dob',
    'lastSeenAt',
    'createdAt',
    'updatedAt',
    'gender',
    'isEmailAuthenticated',
    'isPhoneNumberAuthenticated',
    'status',
    'gender',
    'isLinked',
    'emergencyContact',
    'isVisible',
    'address',
    'bio',
    'isInGroup',
    'voIpToken'
  ];

  protected maskValue(value: any) {
      // return "***"; // If you prefer masking
      return undefined; // remove key entirely
  }

  private sanitize(obj: any): any {
      if (obj === null || typeof obj !== 'object') return obj;

      // Arrays → sanitize each element
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitize(item));
      }

      // Objects
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Remove sensitive keys
        if (this.SENSITIVE_KEYS.includes(key)) {
          sanitized[key] = this.maskValue(value);
          continue;
        }

        // Recursively sanitize nested objects
        sanitized[key] = this.sanitize(value);
      }

      return sanitized;
  }

  async createOneMessage(chatId: string, sender: TokenPayload, createMessageDto: CreateMessageDto) {
  try {
    let client = null;
    let therapist = null;
    let profile = null;

    if (sender.type === UserTypes.CLIENT) client = sender.id;
    if (sender.type === UserTypes.THERAPIST) therapist = sender.id;

    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*,group.*" });
    console.log({chat})
    const { content } = createMessageDto;
    let msg = await chat.addMessage(this.msgRepo, content, therapist, client, this.chatRepo);

    if (!msg) throw new BadRequestException("Unable to send message");

    // Build list of firebase tokens for all recipients except sender
    let tokens: Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    if (chat.group?.length) {
      // Group chat: send to all group clients except sender
      tokens.client = chat.group
        .filter(c => c.id !== sender.id)
        .map(c => c.firebaseToken)
        .filter(Boolean);
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        tokens.therapist.push(chat?.therapist?.firebaseToken);
      }

    } else {
      // One-to-one chat
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        tokens.therapist.push(chat.therapist.firebaseToken);
        profile = chat.client?.profile? chat.client?.profile : chat.client?.avatar.toString() 
      }
      if (sender.type === UserTypes.THERAPIST && chat.client?.firebaseToken) {
        tokens.client.push(chat?.client?.firebaseToken);
        profile = chat.therapist?.profile? chat.therapist?.profile : chat.therapist?.avatar.toString()
      }
    }

    msg = this.sanitize(msg);

      await this.firebaseService.sendPushNotification(
        tokens, 
        JSON.stringify(msg), 
        {...SessionNotif.NEW_MESSAGE, title:sender.name}, 
        content,
        profile
      );

  } catch (error) {
    this.logger.error(`Error sending message: ${error.message}`);
    throw error;
  }
  }

  async editOneMessage(chatId: string, id: string, sender: TokenPayload, updateMessageDto: UpdateMessageDto) {
  try {
    let client = null;
    let therapist = null;
    let profile = null

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
    let tokens: Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    if (chat.group?.length) {
      tokens.client = chat.group
        .filter(c => c.id !== sender.id)
        .map(c => c.firebaseToken)
        .filter(Boolean);
    } else {
      if (sender.type === UserTypes.CLIENT && chat.therapist?.firebaseToken) {
        tokens.therapist.push(chat.therapist.firebaseToken);
        profile = chat.client?.profile? chat.client?.profile : chat.client?.avatar.toString() 
      }
      if (sender.type === UserTypes.THERAPIST && chat.client?.firebaseToken) {
        tokens.client.push(chat.client.firebaseToken);
        profile = chat.therapist?.profile? chat.therapist?.profile : chat.therapist?.avatar.toString()
      }
    }

      await this.firebaseService.sendPushNotification(tokens, JSON.stringify(editedMsg), SessionNotif.EDIT_MESSAGE, content, profile);

  } catch (error) {
    throw error;
  }
  }

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
    const token: Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    isClient ? token.therapist = [chat.therapist?.firebaseToken] : token.client = [chat.client?.firebaseToken];

    await this.firebaseService.sendPushNotification(
        token,
        JSON.stringify({ chatId, readBy, count: result.affected }),
        SessionNotif.MESSAGE_READ,
        `Messages marked as read in chat ${chatId}`,
      );


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

  async remove(id: string) {
    try {
      return await this.chatRepo.update(id,{closed:true});
    } catch (error) {
      this.logger.error(`Error removing chat: ${error.message}`);
      return error;
    }
  }

  async update(id: string, togglechatdTO: ToggleChatDto) {
      const chat = await this.findOne(id);
      Object.assign(chat, togglechatdTO);
      try {
        const updated = await this.chatRepo.save(chat);
        this.logger.log(`Updated chat with ID: ${id}`);
        return updated;
      } catch (error) {
        this.logger.error(`Error updating chatchat: ${error.message}`);
        throw error;
      }  
    }
  

  async call(id: string, caller: TokenPayload, createCallDto: CreateCallDto) {
    try {

    const tokens:Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };
    let  isGroupCall = createCallDto.calleeIds && createCallDto.calleeIds.length > 0 ? true : false;
    let chat;

  if (!isGroupCall) {
    chat = await this.findOne(id, { fields: "client.*,therapist.*" });

    const isCallerClient = chat.client.id === caller.id;
    const callerData = isCallerClient ? chat.client : chat.therapist;
    const calleeData = isCallerClient ? chat.therapist : chat.client;
    const room = `chat_${id}`;

    // Generate tokens uniquely for each participant
    const callerToken = await this.livekitService.createToken(
      callerData.firstName,
      room,
    );

    const calleeToken = await this.livekitService.createToken(
      calleeData.firstName,
      room,
    );

    const payload = {
      room,
      callerData:this.sanitize(callerData),
      chatId: id,
      isVideoCall: createCallDto.isVideoCall,
      isGroupCall: false,
    };
    console.log({payload})
    // Send token only to the callee
    await this.firebaseService.sendPushNotification(
      {
        client: isCallerClient ? [] : [chat.client.firebaseToken],
        therapist: isCallerClient ? [chat.therapist.firebaseToken] : [],
        admin: [],
      },
      JSON.stringify({
        ...payload,
        token: calleeToken, // THE IMPORTANT PART
      }),
      SessionNotif.INCOMING_CALL,
      `Incoming call from ${callerData.firstName}`,
      callerData.profile || callerData.avatar.toString(),
      {
        isClient: !isCallerClient,
        tokens: [calleeData.voIpToken],
      }
    );

    // Return caller's own token in API response
    return {
      room,
      token: callerToken,
      chat,
    };
  }

  else {
    chat = await this.findOne(id, { fields: "group.*, activeCallRoom" });
    const room = `group_${id}`;
    const callerData = await this.therapistService.findOne(caller.id);

    const callerToken = await this.livekitService.createToken(
      callerData.firstName,
      room,
    );
    
    chat.activeCallRoom = room;
    await this.chatRepo.save(chat);
    const groupMembers = chat.group;
    const callees = groupMembers.filter(c => createCallDto.calleeIds.includes(c.id));

    const notifications = [];

    for (const callee of callees) {
      const calleeToken = await this.livekitService.createToken(
        callee.firstName,
        room,
      );

      notifications.push(
        this.firebaseService.sendPushNotification(
          {
            client: [callee.firebaseToken],
            therapist: [],
            admin: [],
          },
          JSON.stringify({
            room,
            callerData:this.sanitize(callerData),
            chatId: id,
            isVideoCall: createCallDto.isVideoCall,
            isGroupCall: true,
            token: calleeToken, 
          }),
          SessionNotif.INCOMING_GROUP_CALL,
          `Incoming group call from ${callerData.firstName}`,
          callerData.profile || callerData.avatar.toString(),
        )
      );
    }

    await Promise.all(notifications);

    return {
      room,
      token: callerToken,  // caller's token
      chat,
    };
  }
    } catch (error) {
      this.logger.error(`Error finding chat for call: ${error.message}`);
      throw error;
    }
  }

  async endCall(chatId: string, caller: TokenPayload) {
    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*, activeCallRoom" });
    console.log({chat, caller})
    const isCallerClient = chat.client?.id === caller.id;
    const tokens:Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    isCallerClient ? tokens.therapist = [chat.therapist?.firebaseToken] : tokens.client = [chat.client?.firebaseToken];
    const callerData = isCallerClient ? chat.client : chat.therapist;

    chat.activeCallRoom = null;
    await this.chatRepo.save(chat);
    console.log({chat})
    await this.firebaseService.sendPushNotification(
      tokens,
      JSON.stringify({ chatId, callerData:this.sanitize(callerData) }),
      SessionNotif.CALL_ENDED,
      `Call ended by ${callerData.firstName}`,
      callerData.profile? callerData.profile: callerData.avatar.toString()
    );

    return { success: true, status: 'ended' };
  }

  async joinCall(id: string, user: TokenPayload) {
    const chat = await this.findOne(id, { fields: "group.*,client.*,therapist.*, activeCallRoom" });
  
    if (!chat.activeCallRoom) {
      throw new BadRequestException("No active call in this chat");
    }
  
    const room = chat.activeCallRoom;
    let actor = null
    if (user.type === UserTypes.CLIENT) {
      actor = await this.clientService.findOne(user.id); // or therapist
    }
    if (user.type === UserTypes.THERAPIST) {
      actor = await this.therapistService.findOne(user.id); // or therapist
    }
    const token = await this.livekitService.createToken(actor.firstName, room);
  
    return { token, room };

  }
  
  async rejectCall(chatId: string, caller: TokenPayload) {
    const chat = await this.findOne(chatId, { fields: "client.*,therapist.*" });
    const isCallerClient = chat.client.id === caller.id;
    
    const tokens:Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    isCallerClient ? tokens.therapist = [chat.therapist?.firebaseToken] : tokens.client = [chat.client?.firebaseToken];
    console.log("reject notif sent to: ",{tokens, isCallerClient})
    
    const callerData = isCallerClient ? chat.client : chat.therapist;
    await this.firebaseService.sendPushNotification(
      tokens,
      JSON.stringify({ chatId, callerData:this.sanitize(callerData) }),
      SessionNotif.CALL_REJECTED,
      `Call rejected by ${callerData.firstName}`,
      callerData.profile? callerData.profile: callerData.avatar.toString()
    );

    return { success: true, status: 'rejected' };
  }

  async addToChat(chatId: string, dto: AddToChatDto) {
      const { groupClients } = dto;
  
      const chat = await this.findOne(chatId, { fields: 'client.*, group.*, therapist.*' });
  
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
