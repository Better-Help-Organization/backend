import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { ApprovalStatus, SessionNotif, SubscriptionStatus, TokenPayload, Tokens } from 'src/common/constants';
import { Availability } from 'src/common/entities/availability.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Between, In, Not, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { AddToSessionDto } from './dto/add-session.dto';
import { SelectSessionDto } from './dto/select-session.dto';
import { AssignSessionDto, UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {

  constructor (
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
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

  async create(id:string, createSessionDto: any) {
    return await this.sessionRepo.manager.transaction(async (manager) => {
      this.logger.log('Creating new session(s)');
      let clientEntity = null;
      let groupEntities = null;
      if (createSessionDto.client) {
        clientEntity = await this.clientService.findOne(createSessionDto.client);
        if (!clientEntity) throw new BadRequestException('Invalid client ID');
      }

      if (createSessionDto.groupClients?.length) {
        groupEntities = await this.clientService.findAll({
          ids: `${createSessionDto.groupClients.join(',')}`,
        });
        if (!groupEntities?.data?.length)
          throw new BadRequestException('Invalid group client IDs');
      }
      const therapistEntity = await this.therapistService.findOne(id);
      if (!therapistEntity) throw new BadRequestException('Invalid therapist ID');

      const { date, startTimes, duration } = createSessionDto;
      const baseDate = new Date(date);

      // CLIENT DAILY CONFLICT CHECK
      if (clientEntity) {
        const startOfDay = new Date(baseDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(baseDate);
        endOfDay.setHours(23, 59, 59, 999);

        const clientConflict = await manager.findOne(Session, {
          where: {
            client: clientEntity,
            schedule: Between(startOfDay, endOfDay),
          },
        });

        if (clientConflict) {
          throw new BadRequestException(
            'Client already has a session scheduled on this date',
          );
        }
      }

      const commonId = uuid();
      const sessions: Session[] = [];
      const sessionIds: string[] = [];

      for (const startTime of startTimes) {
        const [hours, minutes] = startTime.split(':').map(Number);

        const schedule = new Date(baseDate);
        schedule.setHours(hours, minutes, 0, 0);

        const sessionEnd = new Date(schedule.getTime() + duration * 60 * 1000);

        // THERAPIST CONFLICT CHECK
        const therapistConflict = await manager.findOne(Session, {
          where: {
            therapist: therapistEntity,
            approvalStatus: ApprovalStatus.CONFIRMED,
            schedule: Between(
              new Date(schedule.getTime() - duration * 60 * 1000),
              new Date(sessionEnd.getTime()),
            ),
          },
        });

        if (therapistConflict) {
          throw new BadRequestException(`Therapist already has a session at ${schedule.toLocaleString()}`);
        }

        const newSession = manager.create(Session, {
          ...createSessionDto,
          schedule,
          duration,
          client: clientEntity,
          therapist: therapistEntity,
          group: groupEntities?.data || null,
          approvalStatus: ApprovalStatus.PENDING,
          commonId,
        });

        const savedSession = await manager.save(newSession);
        sessions.push(savedSession);
        sessionIds.push(savedSession.id);
      }

      if (sessions.length > 0) {
        // Collect tokens only once
        const tokens: Tokens = { client: [], therapist: [], admin: [] };
        if (clientEntity?.firebaseToken) tokens.client.push(clientEntity.firebaseToken);
        if (groupEntities)
          tokens.client.push(...groupEntities.data.map((c) => c.firebaseToken));
        if (therapistEntity?.firebaseToken)
          tokens.therapist.push(therapistEntity.firebaseToken);

        // Send one notification with all session IDs
        this.firebaseService.sendPushNotification(
          tokens,
          JSON.stringify({ sessionIds, commonId }),
          SessionNotif.SCHEDULED,
          `Your sessions have been scheduled: ${sessions
            .map((s) => s.schedule.toLocaleString())
            .join(', ')}`,
        );
      }

      this.logger.log(`Created ${sessions.length} session(s) successfully`);
      return sessions;
    });
  }

  async selectSession(token: TokenPayload, dto: SelectSessionDto) {
    return await this.sessionRepo.manager.transaction(async (manager) => {
      const { selectedId, commonId } = dto;

      // Load all sessions in this batch
      const groupSessions = await manager.find(Session, {
        where: { commonId, client: { id: token.id } },
        relations: ['therapist', 'client'],
      });

      if (!groupSessions.length) {
        throw new BadRequestException('No sessions found for this selection');
      }

      const selected = groupSessions.find((s) => s.id === selectedId);
      if (!selected) {
        throw new BadRequestException('Selected session is not part of this group');
      }

      if (selected.client.id !== token.id) {
        throw new BadRequestException('Unauthorized selection');
      }

      // HANDLE PENDING CONFLICTS
      if (selected.approvalStatus !== ApprovalStatus.PENDING) {
        throw new BadRequestException('This session slot is no longer available');
      }

      // THERAPIST AVAILABILITY CHECK
      const therapistConflict = await manager.findOne(Availability, {
        where: { therapist: selected.therapist, schedule: selected.schedule },
      });

      if (therapistConflict) {
        throw new BadRequestException(
          `This slot at ${selected.schedule.toLocaleString()} is already taken`,
        );
      }

      // Confirm selected
      selected.approvalStatus = ApprovalStatus.CONFIRMED;
      const confirmed = await manager.save(selected);

      // Delete all others from this group
      const unselected = groupSessions.filter((s) => s.id !== selected.id);
      if (unselected.length) {
        await manager.delete(Session, { id: In(unselected.map((u) => u.id)) });
      }

      // Add to therapist availability
      const availability = manager.create(Availability, {
        therapist: confirmed.therapist,
        schedule: confirmed.schedule,
        duration: confirmed.duration,
      });
      await manager.save(availability);

      // Notify other clients with same schedule
      const duplicates = await manager.find(Session, {
        where: {
          schedule: confirmed.schedule,
          therapist: confirmed.therapist,
          approvalStatus: ApprovalStatus.PENDING,
          id: Not(confirmed.id),
        },
        relations: ['client'],
      });

      for (const dup of duplicates) {
        if (dup.client?.firebaseToken) {
          this.firebaseService.sendPushNotification(
            { client: [dup.client.firebaseToken], therapist: [], admin: [] },
            JSON.stringify(dup),
            SessionNotif.TAKEN,
            `The slot at ${confirmed.schedule.toLocaleString()} is no longer available.`,
          );
        }
      }
      const allSessions: Session[] = [confirmed];

      // Subscription-based recurring sessions
      const subscription = await this.subscriptionRepo.findOne({
        where: { client: { id: token.id }, status: SubscriptionStatus.ACTIVE },
        order: { start_date: 'DESC' },
      });

      if (subscription) {
        const weeks = subscription.type * 4;

        for (let i = 1; i < weeks; i++) {
          const schedule = new Date(selected.schedule);
          schedule.setDate(schedule.getDate() + i * 7);

          // Check if client already has a confirmed session in this week
          const startOfWeek = new Date(schedule);
          startOfWeek.setDate(schedule.getDate() - schedule.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const conflict = await manager.findOne(Session, {
            where: {
              client: selected.client,
              approvalStatus: ApprovalStatus.CONFIRMED,
              schedule: Between(startOfWeek, endOfWeek),
            },
          });

          if (conflict) continue; // skip this week

          const newSession = this.sessionRepo.create({
            therapist: selected.therapist,
            client: selected.client,
            schedule,
            duration: selected.duration,
            type: selected.type,
            commonId,
            approvalStatus: ApprovalStatus.CONFIRMED,
          });

          const saved = await manager.save(newSession);
          allSessions.push(saved);
        }

        this.logger.log(`Generated ${allSessions.length - 1} recurring sessions`);
      }

      return allSessions;
    });
  }

  async update(id: string, updateSessionDto: UpdateSessionDto | AssignSessionDto): Promise<Session> {
    try {
      const session = await this.findOne(id, {fields: 'client.*, therapist.*'});

      Object.assign(session, { ...updateSessionDto });
      const clientToken = await this.clientService.findOne(session.client.id)
      const therapistToken = await this.therapistService.findOne(session.therapist.id)

      const tokens: Tokens = {
        client: [],
        therapist: [],
        admin: [],
      };
      
      tokens.client.push(clientToken?.firebaseToken);
      tokens.therapist.push(therapistToken?.firebaseToken);
      
      const savedSession = await this.sessionRepo.save(session);
      
      const schedule = (updateSessionDto as UpdateSessionDto).schedule;

      if (schedule) 
      this.firebaseService.sendPushNotification(
        tokens,
        JSON.stringify(savedSession),
        SessionNotif.SCHEDULED,
        `Your session has been updated for ${new Date(session.schedule).toLocaleString()}`,
      );
      
      return savedSession
    } catch (error) {
      this.logger.error(`Failed to update Session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addToSession(sessionId: string, dto: AddToSessionDto) {
    const { groupClients } = dto;

    const session = await this.findOne(sessionId, { fields: 'client.*, group.*, therapist.*' });

    if (session.client != null) {
      throw new BadRequestException('Cannot add clients to a 1-on-1 session');
    }

    const existingClientIds = session.group.map(c => c.id);

    // Fetch all clients to be added
    const clientsToAdd = await this.clientService.findAll({
      ids: `${groupClients.join(',')}`,
    });

    const newClients = clientsToAdd.data.filter(
      (c) => !existingClientIds.includes(c.id),
    );

    if (newClients.length === 0) {
      throw new BadRequestException('All clients are already part of the session');
    }

    // ✅ Ensure isInGroup is set to true
    for (const client of newClients) {
      if (!client.isInGroup) {
        await this.clientService.update(client.id, { isInGroup: true });
        client.isInGroup = true; // keep in sync locally
      }
    }

    session.group = [...session.group, ...newClients];
    console.log(session.group);

    return await this.sessionRepo.save(session);
}

// async addToSession(sessionId: string, dto: AddToSessionDto) {
//     const { groupClients } = dto;

//     const session = await this.findOne(sessionId, { fields: 'client.*, group.*, therapist.*' });

//     if(session.client != null) {
//       throw new BadRequestException('Cannot add clients to a 1-on-1 session');
//     }

//     const existingClientIds = session.group.map(c => c.id);

//     // Fetch all clients to be added
//     const clientsToAdd = await this.clientService.findAll({ids: `${groupClients.join(',')}`});

//     const newClients = clientsToAdd.data.filter(c => !existingClientIds.includes(c.id));

//     if (newClients.length === 0) {
//       throw new BadRequestException('All clients are already part of the session');
//     }

//     session.group = [...session.group, ...newClients];
//     console.log(session.group)
//     return await this.sessionRepo.save(session);
//   }

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
