import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { SessionNotif } from 'src/common/constants';
import { Session } from 'src/common/entities/session.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Repository } from 'typeorm';
import { AddToSessionDto } from './dto/add-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {

  constructor (
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    private readonly logger: LoggerService,
    private readonly firebaseService: FirebaseService,  
    private readonly clientService: ClientService,  
    private readonly therapistService: TherapistService,  
  ) {}

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.sessionRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find session: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Session> {
    try {
      const session = await new APIFeatures(this.sessionRepo, queryParams).getOne(id);
      if (!session) {
        throw new NotFoundException(`Session with ID ${id} not found`);
      }
      return session;
    } catch (error) {
      this.logger.error(`Failed to find Session: ${error.message}`);
      throw error;
    }
  }

  async create(id:string, createSessionDto: CreateSessionDto) {
    this.logger.log('Creating a new session');
    try {
      // const newSession = this.sessionRepo.create({
      //   ...createSessionDto,
      //   client: { id: createSessionDto?.client },
      //   therapist: id ? { id } : null,
      //   group: createSessionDto.groupClients?.map(id => ({ id })),
      // });
      // console.log('New session created: - session.service.ts:58', newSession);
      let clientEntity = null;
      let groupEntities = null;
      if(createSessionDto.client) {
        clientEntity = await this.clientService.findOne(createSessionDto.client);
        console.log({clientEntity});
        // throw new BadRequestException('Group clients cannot be empty for group sessions');
      }
      
      if(createSessionDto.groupClients?.length != 0) {
        groupEntities = await this.clientService.findAll({ids: `${createSessionDto.groupClients.join(',')}`});
        console.log('Group entities: - session.service.ts:69', groupEntities);
      }
      const therapistEntity = await this.therapistService.findOne(id);

      const newSession = this.sessionRepo.create({
        ...createSessionDto,
        client: clientEntity,
        therapist: therapistEntity,
        group: groupEntities.data || null,
      });

      const savedSession = await this.sessionRepo.save(newSession);
      
      const tokens: string[] = []
      let clientToken: string[] = []
      if (createSessionDto.client != null) {
        const client = await this.clientService.findOne(createSessionDto.client)
        console.log('Client token: - session.service.ts:86', client); 
        clientToken.push(client.firebaseToken);     
      }
      else {
        const clients = (await this.clientService.findAll({ids: `${createSessionDto.groupClients.join(',')}`}))
        clientToken.push(clients.data.map(c => c.firebaseToken));
        console.log('Group client tokens: - session.service.ts:92', ...clientToken);
      }

      const therapistToken = await this.therapistService.findOne(id)
      console.log('Therapist token: - session.service.ts:96', therapistToken.firebaseToken);
      tokens.push(...clientToken, therapistToken.firebaseToken);

      this.firebaseService.sendPushNotification(
        tokens,
        `Your session has been scheduled for ${new Date(createSessionDto.schedule).toLocaleString()}`,
        SessionNotif.SCHEDULED
      );
  
      this.logger.log('Session created successfully');
      return savedSession;
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw error;
    }
  }


  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    try {
      const session = await this.findOne(id, {fields: 'client.*, therapist.*, type'});

      Object.assign(session, { ...updateSessionDto, note: session.note });

      const clientToken = await this.clientService.findOne(session.client.id)
      const therapistToken = await this.therapistService.findOne(session.therapist.id)

      const tokens: string[] = [];
      
      tokens.push(clientToken?.firebaseToken, therapistToken?.firebaseToken);

      this.firebaseService.sendPushNotification(
        tokens,
        `Your session has been updated for ${new Date(session.schedule).toLocaleString()}`,
        SessionNotif.SCHEDULED
      );
      
      return await this.sessionRepo.save(session);
    } catch (error) {
      this.logger.error(`Failed to update Session: ${error.message}`, error.stack);
      throw error;
    }
  }

async addToSession(sessionId: string, dto: AddToSessionDto) {
    const { groupClients } = dto;

    const session = await this.findOne(sessionId, { fields: 'client.*, group.*, therapist.*' });

    if(session.client != null) {
      throw new BadRequestException('Cannot add clients to a 1-on-1 session');
    }

    const existingClientIds = session.group.map(c => c.id);

    // Fetch all clients to be added
    const clientsToAdd = await this.clientService.findAll({ids: `${groupClients.join(',')}`});

    const newClients = clientsToAdd.data.filter(c => !existingClientIds.includes(c.id));

    if (newClients.length === 0) {
      throw new BadRequestException('All clients are already part of the session');
    }

    session.group = [...session.group, ...newClients];
    console.log(session.group)
    return await this.sessionRepo.save(session);
  }

  async remove(id: string): Promise<void> {
    try {
      const session = await this.findOne(id);
      
      await this.sessionRepo.remove(session);
    } catch (error) {
      this.logger.error(`Failed to remove session: ${error.message}`, error.stack);
      throw error;
    }
  }
}
