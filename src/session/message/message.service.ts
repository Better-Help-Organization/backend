import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionNotif, TokenPayload, Tokens, UserTypes } from 'src/common/constants';
import { Message } from 'src/common/entities/message.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateMessageDto } from '../dto/message/create-message.dto';
import { SessionService } from '../session.service';
// import { CreateDto } from './dto/create-.dto';
// import { UpdateDto } from './dto/update-.dto';

@Injectable()
export class MessageService {

    constructor(
    @InjectRepository(Message) 
    private messageRepo : Repository<Message>,
    private readonly logger: LoggerService,
    private readonly firebaseService: FirebaseService,
    private readonly sessionService: SessionService
  ) {}
  // create(createDto: CreateDto) {
  //   return 'This action adds a new ';
  // }

  // findAll() {
  //   return `This action returns all `;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} `;
  // }
  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.messageRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Error finding all msgs: ${error.message}`);
      return error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Message> {
  try {
    console.log({id, queryParams})
      const msg = await new APIFeatures(this.messageRepo, queryParams).getOne(id);
      if (!msg) throw new NotFoundException('msg not found');
      return msg
    } catch (error) {
      this.logger.error(`Error finding msg: ${error.message}`);
      throw error;
    }
  }

async findAllBySession(id: string, queryParams?: FindAllQueryParams){
  try {
    return await new APIFeatures(this.messageRepo, {...queryParams, filters:`session=${id}`}).getMany();
  } catch (error) {
    this.logger.error(`Error finding all messages by session: ${error.message}`);
    return error;
  }
}

  async createOneMessage(sessionId: string, sender: TokenPayload, createMessageDto: CreateMessageDto){
    try {
      let therapist = null;
      let client = null;
      let profile = null;

      if (sender.type === UserTypes.CLIENT) client = sender.id 
      if (sender.type === UserTypes.THERAPIST) therapist = sender.id
      
      const session = await this.sessionService.findOne(sessionId,{fields:"client.*,therapist.*, group.*"})

      const {content } = createMessageDto

      const msg = await session.addMessage(
        this.messageRepo,
        content, 
        therapist, 
        client
      )

    if (!msg) throw new BadRequestException("Unable to send message");

    const senderId = sender.id;

    // Collect all potential recipients
    let tokens: Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };

    if (session.group.length > 0) {
      tokens.client = session.group
        .filter(g => g.firebaseToken && g.id !== senderId)
        .map(g => g.firebaseToken);
    } else {
      // 1-on-1 session fallback
      if (sender.type === UserTypes.CLIENT && session.therapist.firebaseToken && session.therapist.id !== senderId) {
        tokens.therapist.push(session.therapist.firebaseToken);
      }

      if (sender.type === UserTypes.THERAPIST && session.client.firebaseToken && session.client.id !== senderId) {
        tokens.client.push(session.client.firebaseToken);
      }
    }

      await this.firebaseService.sendPushNotification(
        tokens,
        JSON.stringify(msg),
        SessionNotif.NEW_MESSAGE,
        content
      );

    } catch (error) {
      this.logger.error(`Unable to send message: ${error.message}`);
      return error;
    }
  }


  async remove(id: string, sender: TokenPayload) {
      this.logger.log(`Removing message with ID: ${id}`);

      // Step 1: find the message with its session
      const message = await this.messageRepo.findOne({
        where: { id },
        relations: ['chat', 'chat.client', 'chat.therapist', 'chat.group'],
      });

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      // Step 2: delete the message
      const result = await this.messageRepo.delete(id);
      if (result.affected === 0) {
        throw new BadRequestException(`Unable to remove message with ID ${id}`);
      }

      this.logger.log(`Message with ID ${id} removed`);

      // Step 3: prepare push notification
      const senderId = sender.id;
      const session = message.chat; // your chat/session

      let tokens: Tokens = {
        client: [],
        therapist: [],
        admin: [],
      };

      if (session.group?.length > 0) {
        tokens.client = session.group
          .filter(g => g.firebaseToken && g.id !== senderId)
          .map(g => g.firebaseToken);
      } else {
        // 1-on-1 session
        if (sender.type === UserTypes.CLIENT && session.therapist?.firebaseToken && session.therapist.id !== senderId) {
          tokens.therapist.push(session.therapist.firebaseToken);
        }

        if (sender.type === UserTypes.THERAPIST && session.client?.firebaseToken && session.client.id !== senderId) {
          tokens.client.push(session.client.firebaseToken);
        }
      }

      // Step 4: send notification
      await this.firebaseService.sendPushNotification(
        tokens,
        JSON.stringify({ id, removed: true, chat:message.chat.id }),
        SessionNotif.MESSAGE_REMOVED,
        `A message was deleted`
      );

      return `Message removed`;
    }


  // async remove(id: string) {
  //   console.log(id)
  //   try {
  //     this.logger.log(`Removing message with ID: ${id}`);
  //     const result = await this.messageRepo.delete(id);
  //     if (result.affected === 0) {
  //       throw new NotFoundException(`message with ID ${id} not found`);
  //     }
  //     this.logger.log(`message with ID ${id} removed`);
  //     return `message removed`;
  //   } catch (error) {
  //     this.logger.error(`Error removing message: ${error.message}`);
  //     throw error;
  //   }
  // }

}
