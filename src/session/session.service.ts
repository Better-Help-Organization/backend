import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { ApprovalStatus, DayOfWeek, SessionNotif, SessionStatus, SubscriptionStatus, TokenPayload, Tokens } from 'src/common/constants';
import { Availability } from 'src/common/entities/availability.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Session } from 'src/common/entities/session.entity';
import { Status } from 'src/common/entities/status.entity';
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
import { AssignSessionDto, AttendanceDto, UpdateSessionDto } from './dto/update-session.dto';

function getNextMonday(from: Date): Date {
  const day = from.getDay(); // 0 = Sunday, 1 = Monday ...
  const diff = (8 - day) % 7; // days until next Monday
  const nextMonday = new Date(from);
  nextMonday.setDate(from.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

function getDateForWeekday(baseMonday: Date, weekday: DayOfWeek): Date {
  const map: Record<DayOfWeek, number> = {
    [DayOfWeek.MONDAY]: 0,
    [DayOfWeek.TUESDAY]: 1,
    [DayOfWeek.WEDNESDAY]: 2,
    [DayOfWeek.THURSDAY]: 3,
    [DayOfWeek.FRIDAY]: 4,
    [DayOfWeek.SATURDAY]: 5,
    [DayOfWeek.SUNDAY]: 6,
  };

  const result = new Date(baseMonday);
  result.setDate(baseMonday.getDate() + map[weekday]);
  return result;
}

@Injectable()
export class SessionService {

  constructor (
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Subscription) private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(ClientSubscription) private clientSubscriptionRepo: Repository<ClientSubscription>,
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

      const { dates, duration } = createSessionDto;

      // basic guards
      if (!Array.isArray(dates) || dates.length === 0) {
        throw new BadRequestException('At least one weekday must be provided');
      }

      const baseMonday = getNextMonday(new Date());

      const commonId = uuid();
      const sessions: Session[] = [];
      const sessionIds: string[] = [];

      for (const { date, startTimes } of dates) {
        const actualDate = getDateForWeekday(baseMonday, date);

        // CLIENT DAILY CONFLICT CHECK (same client + therapist + modal + same day)
        if (clientEntity) {
          const startOfDay = new Date(actualDate);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(actualDate);
          endOfDay.setHours(23, 59, 59, 999);

          const clientConflict = await manager.findOne(Session, {
            where: {
              client: clientEntity,
              therapist: therapistEntity,
              modal: createSessionDto.modal ? { id: createSessionDto.modal } : null,
              schedule: Between(startOfDay, endOfDay),
            },
          });

          if (clientConflict) {
            throw new BadRequestException(
              `Client already has a session with this therapist and level on ${actualDate.toDateString()}`
            );
          }
        }

        for (const startTime of startTimes) {
          const [hours, minutes] = startTime.split(':').map(Number);
          const schedule = new Date(actualDate);
          schedule.setHours(hours, minutes, 0, 0);

          const sessionEnd = new Date(schedule.getTime() + duration * 60 * 1000);

          // THERAPIST CONFLICT CHECK (overlap with confirmed sessions)
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
            throw new BadRequestException(
              `Therapist already has a session at ${schedule.toLocaleString()}`,
            );
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
      }

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
        JSON.stringify({ sessionIds }),
        SessionNotif.SCHEDULED,
        `Your sessions have been scheduled: ${sessions
          .map((s) =>
            s.schedule.toLocaleDateString('en-US', {
              month: 'short',   // "Sep"
              day: 'numeric',   // "29"
              year: 'numeric',  // "2025"
              hour: 'numeric',  // "10"
              minute: '2-digit',// "30"
              hour12: true,     // "AM/PM"
            })
          )
          .join(', ')}`
        );

      this.logger.log(`Created ${sessions.length} session(s) successfully`);
      console.log({sessions})
      return sessions;
    });
  }

  async selectSession(token: TokenPayload, dto: SelectSessionDto) {
    return await this.sessionRepo.manager.transaction(async (manager) => {
      const { selectedId } = dto;

      const selectedSession = await this.findOne(selectedId);
      const commonId = selectedSession.commonId;

      // Load all sessions in this batch
      const groupSessions = await manager.find(Session, {
        where: { commonId, client: { id: token.id } },
        relations: ['therapist', 'client', 'modal'],
      });

      if (!groupSessions.length) {
        throw new BadRequestException('No sessions found for this selection');
      }

      // REQUIRE ACTIVE SUBSCRIPTION
      const cs = await this.clientSubscriptionRepo.findOne({
        where: {
          status: SubscriptionStatus.ACTIVE,
          client: {id: token.id },  // go through ClientSubscription -> Client          
        },
        relations: ['client','subscription'], 
        order: { start_date: 'DESC' },
      });

      console.log({cs})

      if (!cs) {
        throw new BadRequestException(
          'You must have an active subscription to confirm a session.',
        );
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

      // THERAPIST CONFLICT CHECK against confirmed sessions
      const therapistConflictInSessions = await manager.findOne(Session, {
        where: {
          therapist: { id: selected.therapist.id },
          schedule: selected.schedule,
          approvalStatus: ApprovalStatus.CONFIRMED,
        },
      });

      if (therapistConflictInSessions) {
        throw new BadRequestException(
          `This slot at ${selected.schedule.toLocaleString()} is already taken`,
        );
      }

      // THERAPIST AVAILABILITY CHECK
      const therapistConflict = await manager.findOne(Availability, {
        where: { therapist: { id: selected.therapist.id }, schedule: selected.schedule },
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

      // Subscription-based recurring session
      const {subscription} = cs
      console.log({subscription})
      if (subscription) {
        const weeks = subscription.type * 4;
        console.log(subscription.type)

      // const createdSchedules: Date[] = [selected.schedule]; // already created first one

      // for (let i = 1; i < weeks; i++) {
      //   const schedule = new Date(selected.schedule);
      //   schedule.setDate(schedule.getDate() + i * 7);

      //   // check conflicts in DB

      //   const startOfWeek = new Date(schedule);
      //   startOfWeek.setDate(schedule.getDate() - schedule.getDay());
      //   startOfWeek.setHours(0, 0, 0, 0);

      //   const endOfWeek = new Date(startOfWeek);
      //   endOfWeek.setDate(startOfWeek.getDate() + 6);
      //   endOfWeek.setHours(23, 59, 59, 999);

      //   console.log({startOfWeek, endOfWeek})
      //   const conflict = await manager.findOne(Session, {
      //     where: {
      //       client: selected.client,
      //       approvalStatus: ApprovalStatus.CONFIRMED,
      //       schedule: Between(startOfWeek, endOfWeek)
      //       // schedule: Between(
      //       //   new Date(schedule.getFullYear(), schedule.getMonth(), schedule.getDate() - schedule.getDay()),
      //       //   new Date(schedule.getFullYear(), schedule.getMonth(), schedule.getDate() - schedule.getDay() + 6, 23, 59, 59, 999)
      //       // ),
      //     },
      //   });
      //   console.log({conflict})
      //   // check conflicts in-memory too
      //   const hasLocalConflict = createdSchedules.some(d =>
      //     Math.abs(d.getTime() - schedule.getTime()) < 7 * 24 * 60 * 60 * 1000
      //   );

      //   console.log({hasLocalConflict})
      //   // if (conflict || hasLocalConflict) continue;
      //   const newSession = this.sessionRepo.create({
      //     therapist: selected.therapist,
      //     client: selected.client,
      //     schedule,
      //     duration: selected.duration,
      //     type: selected.type,
      //     commonId,
      //     modal: selected.modal,
      //     approvalStatus: ApprovalStatus.CONFIRMED,
      //   });

      //   const saved = await manager.save(newSession);
      //   allSessions.push(saved);
      //   createdSchedules.push(schedule);
      // }

      const createdSchedules: Date[] = [new Date(selected.schedule)]; // copy of original

    for (let i = 1; i < weeks; i++) {
    // Always create a fresh date object so no mutation issues
    this.logger.log(`debug ${weeks}, ${typeof(weeks)}`)
    const schedule = new Date(selected.schedule);
    schedule.setDate(schedule.getDate() + i * 7);

   try {
     console.log("Creating schedule for iteration", i, schedule.toISOString());
     console.log("Trying to create recurring session at:", schedule.toISOString());
 
     const newSession = this.sessionRepo.create({
       therapist: selected.therapist,
       client: selected.client,
       schedule,
       duration: selected.duration,
       type: selected.type,
       commonId,
       modal: selected.modal,
       approvalStatus: ApprovalStatus.CONFIRMED,
     });
 
     const saved = await manager.save(newSession);
     console.log("Saved recurring session:", saved.id);
 
     allSessions.push(saved);
 
     createdSchedules.push(schedule);
   } catch (err) {
      console.error("Failed to save recurring session at", schedule.toISOString(), err.message);
   }
    }

    this.logger.log(`Generated ${allSessions.length - 1} recurring sessions`);



        this.logger.log(`Generated ${allSessions.length - 1} recurring sessions`);
      }

      // Notify therapist about confirmed upcoming sessions WITH THIS CLIENT
      const upcomingIds = allSessions.map((s) => s.id);

      const clientName = [confirmed.client.firstName, confirmed.client.lastName]
        .filter(Boolean) // removes null/undefined/empty
        .join(' ');

      if (confirmed.therapist?.firebaseToken) {
        this.firebaseService.sendPushNotification(
          { client: [], therapist: [confirmed.therapist.firebaseToken], admin: [] },
          JSON.stringify({ sessionIds: upcomingIds }),
          SessionNotif.CONFIRMED,
          `You have ${allSessions.length} upcoming confirmed session(s) with ${clientName}.`,
        );
      }
      return allSessions;
    });
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto | AssignSessionDto | AttendanceDto
  ): Promise<Session> {
    try {
    const session = await this.findOne(id, { fields: 'client.*, therapist.*, status.*, latestStatus' });

    const invalidStatuses = [SessionStatus.COMPLETED, SessionStatus.CANCELED];
    if (invalidStatuses.includes(session.latestStatus)) {
      throw new BadRequestException("This session cannot be updated.");
    }

    // ✅ Handle status updates
    if ('status' in updateSessionDto && updateSessionDto.status) {
      const { status, reason } = updateSessionDto.status;

      // Append to history
      const newStatus = this.sessionRepo.manager.create(Status, {
        session,
        status,
        reason,
      });
      await this.sessionRepo.manager.save(Status, newStatus);

      // Update denormalized fields
      session.latestStatus = status;
      session.latestReason = reason;
    }

    // ✅ Apply all other updates (therapist, schedule, etc.)
    Object.assign(session, { ...updateSessionDto, status: undefined });

    const savedSession = await this.sessionRepo.save(session);

    // Send push notification if schedule changed
    if ((updateSessionDto as UpdateSessionDto).schedule) {
      this.firebaseService.sendPushNotification(
        { client: [], therapist: [], admin: [] },
        JSON.stringify(savedSession),
        SessionNotif.SCHEDULED,
        `Your session has been updated for ${new Date(session.schedule).toLocaleString()}`
      );
    }

    // Notify if status changed
    if ((updateSessionDto as UpdateSessionDto).status) {
      this.firebaseService.sendPushNotification(
        { client: [], therapist: [], admin: [] },
        JSON.stringify(savedSession),
        SessionNotif.STATUS_CHANGED,
        `Your session status is now ${session.latestStatus}`
      );
    }

    return savedSession;
  } catch (error) {
    this.logger.error(`Failed to update Session: ${error.message}`, error.stack);
    throw error;
  }
}


  // async update(id: string, updateSessionDto: UpdateSessionDto | AssignSessionDto | AttendanceDto): Promise<Session> {
  //   try {
  //     const session = await this.findOne(id, {fields: 'client.*, therapist.*, status.*'});

  //     // Array of statuses that cannot be updated
  //     const invalidStatuses = [
  //       SessionStatus.COMPLETED,
  //       SessionStatus.CANCELED
  //     ];

  //     // Check if the session status is invalid for update
  //     if (invalidStatuses.includes(session.status.status)) {
  //       throw new BadRequestException("This session status cannot be updated.")
  //       // console.log("This session status cannot be updated.");
  //     }

  //     Object.assign(session, { ...updateSessionDto });
  //     const clientToken = await this.clientService.findOne(session.client.id)
  //     const therapistToken = await this.therapistService.findOne(session.therapist.id)

  //     const tokens: Tokens = {
  //       client: [],
  //       therapist: [],
  //       admin: [],
  //     };
      
  //     tokens.client.push(clientToken?.firebaseToken);
  //     tokens.therapist.push(therapistToken?.firebaseToken);
      
  //     const savedSession = await this.sessionRepo.save(session);
      
  //     const schedule = (updateSessionDto as UpdateSessionDto).schedule;

  //     if (schedule) 
  //     this.firebaseService.sendPushNotification(
  //       tokens,
  //       JSON.stringify(savedSession),
  //       SessionNotif.SCHEDULED,
  //       `Your session has been updated for ${new Date(session.schedule).toLocaleString()}`,
  //     );
      
  //     return savedSession
  //   } catch (error) {
  //     this.logger.error(`Failed to update Session: ${error.message}`, error.stack);
  //     throw error;
  //   }
  // }

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
