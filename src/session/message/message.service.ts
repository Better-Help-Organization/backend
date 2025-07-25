import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionNotif, TokenPayload, UserTypes } from 'src/common/constants';
import { Message } from 'src/common/entities/message.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
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

  findAll() {
    return `This action returns all `;
  }

  findOne(id: number) {
    return `This action returns a #${id} `;
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
      let therapist = null
      let client = null

      if (sender.type === UserTypes.CLIENT) client = sender.id 
      if (sender.type === UserTypes.THERAPIST) therapist = sender.id
      
      const session = await this.sessionService.findOne(sessionId,{fields:"client.*,therapist.*"})

      const {content } = createMessageDto

      const msg = await session.addMessage(
        this.messageRepo,
        content, 
        therapist, 
        client
      )

      if(msg) {
        let token = []
        if (sender.type === UserTypes.CLIENT) token.push(session.client.firebaseToken)
        if( sender.type === UserTypes.THERAPIST) token.push(session.therapist.firebaseToken)

        await this.firebaseService.sendPushNotification(
          token, 
          JSON.stringify(msg),
          SessionNotif.NEW_MESSAGE);
      }
      else {
        throw new BadRequestException("Unable to send message")
      }

    } catch (error) {
      this.logger.error(`Unable to send message: ${error.message}`);
      return error;
    }
  }

  // async findOneBySession(id: number, queryParams?: FindAllQueryParams){
  //     try {
  //       return await new APIFeatures(this., {...queryParams, filters:`chat=${id}`}).getMany();
  //     } catch (error) {
  //       // this.logger.error(`Error finding all bookings: ${error.message}`);
  //       return error;
  //     }
  //   }
  

  // update(id: number, updateDto: UpdateDto) {
  //   return `This action updates a #${id} `;
  // }

  remove(id: number) {
    return `This action removes a #${id} `;
  }
}
