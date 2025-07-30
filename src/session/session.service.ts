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
      const newSession = this.sessionRepo.create({
        ...createSessionDto,
        client: { id: createSessionDto.client },
        therapist: id ? { id } : null,
        // groupClients: createSessionDto.groupClients?.map(id => ({ id })),
      });
      const savedSession = await this.sessionRepo.save(newSession);
      
      const tokens: string[] = []
      
      const clientToken = await this.clientService.findOne(createSessionDto.client)
      const therapistToken = await this.therapistService.findOne(id)

      tokens.push(clientToken?.firebaseToken, therapistToken?.firebaseToken);

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

    const newClients = clientsToAdd.filter(c => !existingClientIds.includes(c.id));

    if (newClients.length === 0) {
      throw new BadRequestException('All clients are already part of the session');
    }

    session.group = [...session.group, ...newClients];

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
