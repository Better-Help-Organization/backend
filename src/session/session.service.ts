import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { ApprovalStatus, DayOfWeek, SessionNotif, SubscriptionStatus, SubscriptionType, TokenPayload, Tokens } from 'src/common/constants';
import { Availability } from 'src/common/entities/availability.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Session } from 'src/common/entities/session.entity';
import { Status } from 'src/common/entities/status.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Between, DataSource, In, Not, Repository } from 'typeorm';
import { v4 as uuid, v4 as uuidv4 } from 'uuid';
import { AddToSessionDto } from './dto/add-session.dto';
import { CreateGroupSession } from './dto/create-session.dto';
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
    private readonly dataSource: DataSource,
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
        `Your are matched with a therapist choose one out of the list of scheduled times`
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
      // Nullify client's hasNotification after successful confirmation
      await manager.update(Client, { id: confirmed.client.id }, { hasNotification: null });

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

            // update subscription start and end dates to the first and last session
            const firstSessionDate = allSessions
              .map(s => s.schedule)
              .sort((a, b) => a.getTime() - b.getTime())[0];
            
            const lastSessionDate = allSessions
              .map(s => s.schedule)
              .sort((a, b) => b.getTime() - a.getTime())[0];

            // Update main Subscription entity
            subscription.start_date = firstSessionDate;
            subscription.end_date = lastSessionDate;
            await manager.save(subscription);

            // Update the corresponding ClientSubscription
            const clientSub = await manager.findOne(ClientSubscription, {
              where: { client: { id: selected.client.id }, subscription: { id: subscription.id } },
            });

            if (clientSub) {
              clientSub.start_date = firstSessionDate;
              clientSub.end_date = lastSessionDate;
              await manager.save(clientSub);

              this.logger.log(
                `Updated ClientSubscription ${clientSub.id}: start=${firstSessionDate.toISOString()}, end=${lastSessionDate.toISOString()}`
              );
            }

            this.logger.log(
              `Updated subscription ${subscription.id}: start=${firstSessionDate.toISOString()}, end=${lastSessionDate.toISOString()}`
            );
          } catch (err) {
              console.error("Failed to save recurring session at", schedule.toISOString(), err.message);
          }
        }

        this.logger.log(`Generated ${allSessions.length - 1} recurring sessions`);
        cs.session = allSessions
        this.clientSubscriptionRepo.save(cs);
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
    const session = await this.findOne(id, {
      fields: 'client.*, therapist.*, status.*, latestStatus, hasTherapistAttended',
    });

    // ✅ If therapist attended, restrict updates except 'note'
    if (session.hasTherapistAttended) {
      const allowedField = 'note';

      // Find which disallowed fields were sent in DTO
      const invalidFields = Object.keys(updateSessionDto).filter(
        (key) => key !== allowedField && updateSessionDto[key as keyof typeof updateSessionDto] !== undefined
      );

      if (invalidFields.length > 0) {
        const readableFields = invalidFields
          .map((f) => f.replace(/([A-Z])/g, ' $1').toLowerCase())
          .join(', ');
        throw new BadRequestException(
          `You can’t change ${readableFields} for this session because sessoin is complete.`
        );
      }
    }

    // ✅ Apply updates normally if allowed
    const sanitizedDto = { ...(updateSessionDto as UpdateSessionDto) };

    // ✅ Handle status updates
    if ('status' in sanitizedDto && sanitizedDto.status) {
      const { status, reason } = sanitizedDto.status;

      const newStatus = this.sessionRepo.manager.create(Status, {
        session,
        status,
        reason,
      });
      await this.sessionRepo.manager.save(Status, newStatus);
      session.latestStatus = status;
      session.latestReason = reason;
    }

    // ✅ Apply all other updates
    Object.assign(session, { ...sanitizedDto, status: undefined });
    const savedSession = await this.sessionRepo.save(session);

    // ✅ Notify schedule change
    if ('schedule' in sanitizedDto) {
      this.firebaseService.sendPushNotification(
        { client: [], therapist: [], admin: [] },
        JSON.stringify(savedSession),
        SessionNotif.SCHEDULED,
        `Your session has been updated for ${new Date(
          session.schedule
        ).toLocaleString()}`
      );
    }

    // ✅ Notify status change
    if ('status' in sanitizedDto) {
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

  async createGroupSession(dto: CreateGroupSession) {
    this.logger.log("Creating a group session")
    return await this.dataSource.transaction(async (manager) => {
      // 1️⃣ Validate therapist
      const therapist = await manager.findOne(Therapist, { where: { id: dto.therapist } });
      if (!therapist) throw new NotFoundException('Therapist not found');
      console.log({therapist})
      // 2️⃣ Validate clients
      // const clients = await manager.findBy(Client, { id: In(dto.groupClients) });

      const clients = await manager.find(Client, {
        where: { id: In(dto.groupClients) },
        relations: ['activeSubscription', 'activeSubscription.subscription'],
      });

      if (!clients.length) throw new BadRequestException('No valid clients found');

      // 3️⃣ Validate date + time
      if (!dto.date || !dto.date.startTime) throw new BadRequestException('Date and startTime are required');

      const baseMonday = getNextMonday(new Date());
      const targetDate = getDateForWeekday(baseMonday, dto.date.date);
      const [hours, minutes] = dto.date.startTime.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);

      // 4️⃣ Fetch subscriptions for all clients
      const clientSubs = await manager.find(ClientSubscription, {
        where: {
          client: { id: In(clients.map(c => c.id)) },
          status: SubscriptionStatus.ACTIVE,
        },
        relations: ['client', 'subscription'],
        order: { start_date: 'ASC' },
      });
      console.log({clientSubs})
      if (!clientSubs.length) throw new BadRequestException('No active subscriptions found');

      // // 5️⃣ Determine weeks per client
      // const clientWeeksMap = new Map<string, number>();
      // let maxWeeks = 0;

      // for (const cs of clientSubs) {
      //   const weeks = cs.subscription.type * 4; // assuming type = number of weeks per month
      //   clientWeeksMap.set(cs.client.id, weeks);
      //   if (weeks > maxWeeks) maxWeeks = weeks;
      // }
      // 5️⃣ Determine weeks per client using activeSubscription
  
      // 5️⃣ Determine sessions per client using activeSubscription
      const clientWeeksMap = new Map<string, number>();
      let maxWeeks = 0;

      // Only consider clients with an active subscription
      for (const client of clients) {
        console.log({client})
        if (!client.activeSubscription || !client.activeSubscription.subscription) continue;

        const typeValue = client.activeSubscription.subscription.type;
        const weeks = typeValue === SubscriptionType.TRIAL ? 1 : typeValue * 4;

        // const weeks = client.activeSubscription.subscription.type * 4; // type = months, 1 month = 4 weeks
        console.log({weeks})
        clientWeeksMap.set(client.id, weeks);
        if (weeks > maxWeeks) maxWeeks = weeks;
      }

      const commonId = uuidv4();

      // 6️⃣ Create sessions based on longest subscription
      const allSessions: Session[] = [];
      const scheduleDates: Date[] = []; // store created schedule dates

      console.log({maxWeeks})
      for (let i = 0; i < maxWeeks; i++) {
        const schedule = new Date(targetDate); // base schedule for first session
        schedule.setDate(targetDate.getDate() + i * 7); // next week offset
        console.log({schedule})
        // Attach clients according to their subscription length
        const clientsForThisSession = clients.filter(c => {
          const weeks = clientWeeksMap.get(c.id) ?? 0;
          return weeks > i; // attach only if this client has remaining sessions
        });
        console.log({clientsForThisSession})
        if (!clientsForThisSession.length) continue; // skip if no clients for this week

        const session = manager.create(Session, {
          therapist,
          group: clientsForThisSession,
          groupName: dto.groupName ?? 'Group Session',
          schedule,
          duration: dto.duration,
          type: dto.type,
          note: dto.note ?? null,
          approvalStatus: ApprovalStatus.CONFIRMED,
          modal: dto.modal ? ({ id: dto.modal } as any) : null,
          client: null,
          commonId
        });
        console.log({session})
        const savedSession = await manager.save(session);
        allSessions.push(savedSession);
        scheduleDates.push(schedule);

        // ✅ Update isInGroup for clients
        for (const client of clientsForThisSession) {
          if (!client.isInGroup) {
            console.log({client})
            await manager.update(Client, { id: client.id }, { isInGroup: true });
            console.log({client})
          }
        }
      }

      // 7️⃣ Send notifications
      const tokens: Tokens = { client: [], therapist: [], admin: [] };

      // collect client tokens
      clients.forEach(c => {
        if (c.firebaseToken) tokens.client.push(c.firebaseToken);
      });

      // therapist token
      if (therapist.firebaseToken) tokens.therapist.push(therapist.firebaseToken);

      // send push notification
      await this.firebaseService.sendPushNotification(
        tokens,
        JSON.stringify({ sessionIds: allSessions.map(s => s.id) }),
        SessionNotif.GROUP_SCHEDULED,
        `Your group session(s) have been Created.`
      );

      return allSessions;

    });
  }

  async addToSession(sessionId: string, dto: AddToSessionDto) {
  return await this.sessionRepo.manager.transaction(async (manager) => {
    const { groupClients } = dto;

    // 1️⃣ Load full reference session with all relations
    const referenceSession = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: [
        'client',
        'group',
        'therapist',
        'modal',
        'status',
        'message',
      ],
    });

    if (!referenceSession) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (referenceSession.client != null) {
      throw new BadRequestException('Cannot add clients to a 1-on-1 session');
    }

    if (!referenceSession.commonId) {
      throw new BadRequestException('This session is not part of a group series');
    }

    // 2️⃣ Find all sessions in the same group series
    const relatedSessions = await this.sessionRepo.find({
      where: { commonId: referenceSession.commonId },
      relations: ['group', 'therapist', 'client'],
      order: { schedule: 'ASC' },
    });

    if (!relatedSessions.length) {
      throw new BadRequestException('No related sessions found for this group');
    }

    const lastSessionDate = relatedSessions[relatedSessions.length - 1]?.schedule;

    // 3️⃣ Collect existing client IDs across all sessions
    const existingClientIds = new Set(relatedSessions.flatMap(s => s.group.map(c => c.id)));

    // 4️⃣ Fetch new clients to add
    const clientsToAdd = await this.clientService.findAll({ ids: groupClients.join(',') });
    const newClients = clientsToAdd.data.filter(c => !existingClientIds.has(c.id));

    if (!newClients.length) {
      throw new BadRequestException('All clients are already part of these group sessions');
    }

    const now = new Date();
    const allUpdatedSessions: Session[] = [...relatedSessions];

    // 5️⃣ Process each new client
    for (const client of newClients) {
      // ✅ Ensure isInGroup flag
      if (!client.isInGroup) {
        await manager.update(Client, { id: client.id }, { isInGroup: true });
        client.isInGroup = true;
      }

      const activeSub = client.activeSubscription;
      if (!activeSub || !activeSub.subscription) continue;

      const subEnd = new Date(activeSub.end_date);

      // 6️⃣ Attach client only to future sessions within subscription
      for (const session of relatedSessions) {
        const sessionDate = new Date(session.schedule);

        // Skip past sessions (already occurred)
        if (sessionDate < now) continue;

        // Join client if subscription covers the session
        if (subEnd >= sessionDate) {
          if (!session.group.find((c) => c.id === client.id)) {
            session.group.push(client);
          }
        } else {
          // Extend subscription if session is beyond current end date
          const existingSub = await manager.findOne(ClientSubscription, {
            where: {
              client: { id: client.id },
              subscription: { id: activeSub.subscription.id },
            },
          });

          if (!existingSub) {
            const extensionSub = manager.create(ClientSubscription, {
              client,
              subscription: activeSub.subscription,
              start_date: new Date(subEnd.getTime() + 1),
              end_date: sessionDate,
              status: SubscriptionStatus.ACTIVE,
            });
            await manager.save(extensionSub);
            client.activeSubscription = extensionSub;
            await manager.save(client);
          }

          if (!session.group.find((c) => c.id === client.id)) {
            session.group.push(client);
          }
        }
      }

      // 7️⃣ Create new sessions if subscription extends beyond the final session
      if (subEnd > lastSessionDate) {
        let nextDate = new Date(lastSessionDate);
        nextDate.setDate(nextDate.getDate() + 7); // weekly offset

        while (nextDate <= subEnd) {
          const clonedSession = manager.create(Session, {
            therapist: referenceSession.therapist,
            group: [client],
            groupName: referenceSession.groupName,
            schedule: new Date(nextDate),
            duration: referenceSession.duration,
            type: referenceSession.type,
            note: referenceSession.note,
            approvalStatus: ApprovalStatus.CONFIRMED,
            modal: referenceSession.modal ? ({ id: referenceSession.modal.id } as any) : null,
            client: null,
            commonId: referenceSession.commonId,
          });

          const saved = await manager.save(clonedSession);
          allUpdatedSessions.push(saved);
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
    }

    // 8️⃣ Save all updated sessions
    for (const session of relatedSessions) {
      await manager.save(session);
    }

    // 9️⃣ Send notifications
    const tokens: Tokens = { client: [], therapist: [], admin: [] };
    const clientTokens = newClients.map(c => c.firebaseToken).filter(Boolean);
    tokens.client.push(...clientTokens);

    const therapistToken = referenceSession.therapist?.firebaseToken;
    if (therapistToken) tokens.therapist.push(therapistToken);

    await this.firebaseService.sendPushNotification(
      tokens,
      JSON.stringify({ commonId: referenceSession.commonId }),
      SessionNotif.SCHEDULED,
      `You have been added to all upcoming group sessions in this series.`
    );
    return allUpdatedSessions;
  });
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
