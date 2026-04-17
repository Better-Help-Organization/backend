import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatService } from 'src/chat/chat.service';
import { ClientService } from 'src/client/client.service';
import { ApprovalStatus, DayOfWeek, DefaultParameters, SessionNotif, SubscriptionStatus, SubscriptionType, TokenPayload, Tokens } from 'src/common/constants';
import { Availability } from 'src/common/entities/availability.entity';
import { Chat } from 'src/common/entities/chat.entity';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { SessionClientNotes } from 'src/common/entities/session-client-notes.entity';
import { Session } from 'src/common/entities/session.entity';
import { Status } from 'src/common/entities/status.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { toEthiopianTime } from "src/common/utils/toEthiopianTime";
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { ParameterService } from 'src/parameter/parameter.service';
import { ReminderService } from 'src/reminder/reminder.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { Between, DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { v4 as uuid, v4 as uuidv4 } from 'uuid';
import { AddToSessionDto } from './dto/add-session.dto';
import { BatchUpdateSessionDto } from './dto/batch-update-session.dto';
import { CreateGroupSession } from './dto/create-session.dto';
import { RemoveFromSessionDto } from './dto/remove-session.dto';
import { SelectSessionDto } from './dto/select-session.dto';
import { AssignSessionDto, AttendanceDto, UpdateGroupSessionNote, UpdateSessionDto } from './dto/update-session.dto';


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
    @InjectRepository(Chat) private chatRepo: Repository<Chat>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(ClientSubscription) private clientSubscriptionRepo: Repository<ClientSubscription>,
    @InjectRepository(Availability) private availabilityRepo: Repository<Availability>,
    private readonly logger: LoggerService,
    private readonly firebaseService: FirebaseService,  
    private readonly clientService: ClientService,  
    private readonly therapistService: TherapistService,
    private readonly dataSource: DataSource,
    private readonly paramService: ParameterService,
    private readonly chatService: ChatService,
    private readonly reminderService: ReminderService,
  ) {}

  async findAll(queryParams?: FindAllQueryParams, start?: string, end?: string) {
    try {
    const dateFilter = {
      field: 'createdAt', // 👈 dynamically choose the date field here
      start,
      end,
    };

      return await new APIFeatures(this.sessionRepo, queryParams).getMany({dateFilter});
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

  async markAttendance(sessionId: string, clientId: string) {
    // Load full session with group and attendance relations
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['group', 'groupAttendance']
    });

    if (!session) throw new Error('Session not found');

    // Check if client is in assigned group[]
    const existsInGroup = session.group.some(c => c.id === clientId);
    if (!existsInGroup) {
      throw new Error('Client is not part of this session group');
    }

    // Check if already marked
    const alreadyMarked = session.groupAttendance.some(c => c.id === clientId);
    if (alreadyMarked) {
      return session; // ignore duplicates
    }

    // Add them to attendance list
    session.groupAttendance.push({ id: clientId } as any);

    return await this.sessionRepo.save(session);

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

      let { dates, duration } = createSessionDto;
      duration =  await this.paramService.getDefaultByName(DefaultParameters.SESSION_HOUR)

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

          console.log({createSessionDto})
          delete createSessionDto.id

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
      // if (therapistEntity?.firebaseToken)
      //   tokens.therapist.push(therapistEntity.firebaseToken);

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
        relations: ['therapist', 'client', 'modal', 'subscription'],
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
      if (!cs.therapist) {
        cs.therapist = selected.therapist;
        await manager.save(cs);
      }

      selected.approvalStatus = ApprovalStatus.CONFIRMED;
      selected.subscription = cs;
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
      if (subscription) {
        const weeks = subscription.type * 4;
        console.log(subscription.type)
  
        const createdSchedules: Date[] = [new Date(selected.schedule)]; // copy of original

        await manager.upsert(Chat, {
              client: selected.client,
              therapist: selected.therapist,
              groupName: null,
              group: null,
              closed:false,
        },  ['client', 'therapist']);

        const savedChat = await manager.findOne(Chat, {
          where: { client: { id: selected.client.id }, therapist: { id: selected.therapist.id } },
        });

        // let savedChat = await manager.save(Chat, chat);

        for (let i = 1; i < weeks; i++) {
          // Always create a fresh date object so no mutation issues
          this.logger.log(`debug ${weeks}, ${typeof(weeks)}`)
          const schedule = new Date(selected.schedule);
          schedule.setDate(schedule.getDate() + i * 7);

          try {
            console.log("Creating schedule for iteration - session.service.ts:355", i, schedule.toISOString());
            console.log("Trying to create recurring session at: - session.service.ts:356", schedule.toISOString());
            
            // const chat = manager.create(Chat, {
            //   client: selected.client,
            //   therapist: selected.therapist,
            //   groupName: null,
            //   group: null,
            // });
            // const savedChat = await manager.save(Chat, chat);

            const newSession = manager.create(Session, {
              therapist: selected.therapist,
              client: selected.client,
              subscription: cs,
              schedule,
              duration: selected.duration,
              type: selected.type,
              commonId,
              modal: selected.modal,
              approvalStatus: ApprovalStatus.CONFIRMED,
              chat: savedChat,
            });

            delete newSession.id; // ensure no leftover ID from cache
            selected.chat = savedChat;
            const saved = await manager.save(newSession);
            console.log("Saved recurring session: - session.service.ts:373", saved.id);
        
            allSessions.push(saved);
        
            createdSchedules.push(schedule);

            // Create availability for this session
            const availability = manager.create(Availability, {
              therapist: saved.therapist,
              schedule: saved.schedule,
              duration: saved.duration,
            });
            await manager.save(availability);

            // update subscription start and end dates to the first and last session
            const firstSessionDate = allSessions
              .map(s => s.schedule)
              .sort((a, b) => a.getTime() - b.getTime())[0];
            
            const lastSessionDate = allSessions
              .map(s => s.schedule)
              .sort((a, b) => b.getTime() - a.getTime())[0];

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
              console.error("Failed to save recurring session at - session.service.ts:415", schedule.toISOString(), err.message);
          }
        }

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
      };
        // const chat = await this.chatService.create(selected.therapist.id, {
        //   client: selected.client.id,
        //   therapist: selected.therapist.id,
        //   groupClients: null,
        //   groupName: null,
        // });

        // // Link chat to all confirmed sessions
        // await manager.update(Session, 
        //   { id: In(allSessions.map(s => s.id)) }, 
        //   { chat: { id: chat.id } }
        // );
        await Promise.all(allSessions.map(s => this.reminderService.scheduleReminders(s)));

      return allSessions;
    });
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto | AssignSessionDto | AttendanceDto
  ): Promise<Session> {
    try {
      const session = await this.sessionRepo.findOne(
        {
          where: {id},
          relations: ['client', 'therapist', 'chat', 'group'],
        }
      );

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
            `You can’t change ${readableFields} for this session because session is complete.`
          );
        }
      }

      // ✅ Apply updates normally if allowed
      const sanitizedDto = { ...(updateSessionDto as UpdateSessionDto) };
      const previousTherapist = session.therapist;

      // Collect client tokens from both individual and group sessions
      const clientTokens: string[] = [];
      if (session.client?.firebaseToken) clientTokens.push(session.client.firebaseToken);
      if (session.group?.length) {
        session.group.forEach(c => { if (c.firebaseToken) clientTokens.push(c.firebaseToken); });
      }

      const clientName = session.client
        ? `${session.client.firstName} ${session.client.lastName}`
        : 'a group session';
      const clientIdForPayload = session.client?.id ?? session.commonId;

      // ✅ Check for therapist reassignment
      if ('therapist' in sanitizedDto && sanitizedDto.therapist && session.therapist?.id !== sanitizedDto.therapist) {
        const newTherapist = await this.therapistService.findOne(sanitizedDto.therapist);
        if (!newTherapist) throw new NotFoundException('New therapist not found');

        session.therapist = newTherapist;

        // update therapist for each chat
        if (session.chat) {
          await this.chatRepo.update(session.chat.id, {
            therapist: newTherapist
          });
        }

        // --- Send push notifications ---

        const prevTherapistToken = previousTherapist?.firebaseToken;
        const newTherapistToken = newTherapist?.firebaseToken;

        // 🟢 Notify client(s)
        if (clientTokens.length) {
          await this.firebaseService.sendPushNotification(
            { client: clientTokens, therapist: [], admin: [] },
            JSON.stringify({ therapistId: newTherapist.id }),
            SessionNotif.TH_REASSIGNED_CLIENT,
            `Your therapist has been changed to ${newTherapist.firstName}.`
          );
        }

        // 🟠 Notify previous therapist
        if (prevTherapistToken) {
          await this.firebaseService.sendPushNotification(
            { client: [], therapist: [prevTherapistToken], admin: [] },
            JSON.stringify({ clientId: clientIdForPayload }),
            SessionNotif.TH_REASSIGNED_OLD_THERAPIST,
            `Client ${clientName} has been reassigned from you.`
          );
        }

        // 🔵 Notify new therapist
        if (newTherapistToken) {
          await this.firebaseService.sendPushNotification(
            { client: [], therapist: [newTherapistToken], admin: [] },
            JSON.stringify({ clientId: clientIdForPayload }),
            SessionNotif.TH_REASSIGNED_NEW_THERAPIST,
            `You have been assigned to ${clientName}.`
          );
        }
      }

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

      if (session.hasTherapistAttended) {
        if ('therapist' in updateSessionDto && updateSessionDto.therapist) {
          if (updateSessionDto.therapist !== session.therapist?.id) {
            throw new BadRequestException('Cannot reassign therapist after session has been attended.');
          }
        }
      }



      // ✅ Apply all other updates
        // const { therapist: _therapistId, status: _status, ...rest } = sanitizedDto as any;
        // Object.assign(session, rest);
        // const savedSession = await this.sessionRepo.save(session);
      Object.assign(session, { ...sanitizedDto, status: undefined });
      const savedSession = await this.sessionRepo.save(session);

      // ✅ Notify schedule change
      if ('schedule' in sanitizedDto) {
        console.log('Schedule changed, sending notification - session.service.ts:551',session.schedule);
        const etTime = toEthiopianTime(session.schedule);

        this.firebaseService.sendPushNotification(
          { client: clientTokens, therapist: [session.therapist?.firebaseToken], admin: [] },
          JSON.stringify(savedSession),
          SessionNotif.RE_SCHEDULED,
          `Your session has been updated for ${etTime}`
        );

        // Cancel old reminders and reschedule with new time
        await this.reminderService.cancelReminders(session.id);
        await this.reminderService.scheduleReminders(savedSession);

      }

      // ✅ Notify status change
      if ('status' in sanitizedDto) {
        this.firebaseService.sendPushNotification(
          { client: clientTokens, therapist: [session.therapist?.firebaseToken], admin: [] },
          JSON.stringify(savedSession),
          SessionNotif.STATUS_CHANGED,
          `Your session status is now ${session.latestStatus}`
        );
      }

      if ('hasTherapistAttended' in sanitizedDto) {
        const name = session.client ? `${session.client.firstName} ${session.client.lastName}` : 'group';
        await this.firebaseService.sendPushNotification(
          { therapist: [session.therapist?.firebaseToken]},
          JSON.stringify({sessionId:session.id}),
          SessionNotif.THERAPIST_ATTENDANCE_MARKED,
          `Attendace marked for session with ${clientName}`
        );
        await this.handleTherapistAttendanceCompletion(savedSession.client.id, savedSession.commonId);
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

      console.log({clients})
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

      // if atleast one doesn't have an active subscription return error
      for (const client of clients) {
        console.log({client})
        if (!client.activeSubscription || !client.activeSubscription.subscription) {
          const fullname = client.firstName + " " + client.lastName; 
          throw new BadRequestException(
            `Client ${ fullname ?? client.id} does not have an active subscription`
          );
        }

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
      const chat = manager.create(Chat, {
          client: null,
          therapist,
          group: clients,
          groupName: dto.groupName ?? 'Default Group Chat Name',
        });

      let savedChat = await manager.save(chat);
      let durationParam = await this.paramService.getDefaultByName(DefaultParameters.SESSION_HOUR)

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

        // const clientsForThisSessionRefs = clientsForThisSession.map(c => {
        //   return { id: c.id } as Client; // cast to entity type
        // });

        // console.log({clientsForThisSessionRefs})
        // let durationParam = await this.paramService.getDefaultByName(DefaultParameters.SESSION_HOUR)

        // const chat = manager.create(Chat, {
        //     client: null,
        //     therapist,
        //     group: clients,
        //     groupName: dto.groupName ?? 'Default Group Chat Name',
        //   });

        // const savedChat = await manager.save(chat);

        const session = manager.create(Session, {
          therapist,
          group: clientsForThisSession,
          groupName: dto.groupName ?? 'Default Group Session Name',
          schedule,
          duration: durationParam as number,
          type: dto.type,
          note: dto.note ?? null,
          approvalStatus: ApprovalStatus.CONFIRMED,
          modal: dto.modal ? ({ id: dto.modal } as any) : null,
          client: null,
          commonId,
          subscription: null,             // Ensure single subscription field is null
          chat: savedChat  // add this
        });
        console.log({session})

        const subs: ClientSubscription[] = [];
        for (const client of clientsForThisSession) {
          if (client.activeSubscription && client.activeSubscription.subscription) {
            subs.push(client.activeSubscription);
          }
        }
        session.groupSubscription = subs;

        const savedSession = await manager.save(session);
        allSessions.push(savedSession);
        scheduleDates.push(schedule);

        // ✅ Update isInGroup for clients
        for (const client of clientsForThisSession) {
          if (!client.activeSubscription) throw new BadRequestException('Client missing active subscription') ;
          console.log({clientSubscription: client.activeSubscription})
          const clientSub = await manager.findOne(ClientSubscription, {
            where: { id: client.activeSubscription.id },
            relations: ['session'],
          });

          if (clientSub) {
            clientSub.session = [...(clientSub.session || []), savedSession];
            
            // Update subscription start/end based on sessions
            const allClientSessions = [...(clientSub.session || [])];
            const firstDate = allClientSessions.map(s => s.schedule).sort((a, b) => a.getTime() - b.getTime())[0];
            const lastDate = allClientSessions.map(s => s.schedule).sort((a, b) => b.getTime() - a.getTime())[0];

            clientSub.start_date = firstDate;
            clientSub.end_date = lastDate;
            clientSub.therapist = therapist;

            await manager.save(clientSub);
          }
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

      await Promise.all(allSessions.map(s => this.reminderService.scheduleReminders(s)));

      return allSessions;

    });
  }

  async addToSession(sessionId: string, dto: AddToSessionDto) {
  return await this.sessionRepo.manager.transaction(async (manager) => {
    const { groupClients } = dto;
    const now = new Date();
    // const now = new Date("2025-12-02");

    // 1️⃣ Load full reference session with all relations
    const referenceSession = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: [
        'client',
        'group',
        'groupSubscription',
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
      where: { 
        commonId: referenceSession.commonId,
      schedule: MoreThan(now),
    },
      relations: ['group', 'therapist', 'client', 'groupSubscription'],
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

            //Attach subscription to this session
            if (!session.groupSubscription) session.groupSubscription = [];
            const subToAttach = client.activeSubscription;
            if (
              subToAttach &&
              !session.groupSubscription.find(s => s.id === subToAttach.id)
            ) {
              session.groupSubscription.push(subToAttach);
            }

            // Also sync DB relation (existing logic)
            await manager
              .createQueryBuilder()
              .relation(Session, "groupSubscription")
              .of(session.id)  // session entity or session.id
              .add(activeSub);
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

            // Attach subscription for extended case
            if (!session.groupSubscription) session.groupSubscription = [];
            const subToAttach = client.activeSubscription;
            if (
              subToAttach &&
              !session.groupSubscription.find(s => s.id === subToAttach.id)
            ) {
              session.groupSubscription.push(subToAttach);
            }
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

          // Attach subscription to new cloned sessions
          await manager
            .createQueryBuilder()
            .relation(Session, "groupSubscription")
            .of(saved.id)
            .add(client.activeSubscription);

          allUpdatedSessions.push(saved);
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
    }

    // 8️⃣ Save all updated sessions
    for (const session of relatedSessions) {
      await manager.save(Session, session);
    }
    /////////////////
    try {
      const chatWithSessions = await manager.findOne(Chat, {
        where: { session: { commonId: referenceSession.commonId } },
        relations: ['group'],
      });

      if (chatWithSessions) {
        chatWithSessions.group = [...(chatWithSessions.group ?? []), ...newClients];
        await manager.save(Chat, chatWithSessions);
      }
    } catch {
      this.logger.warn(`No chat found for session series ${referenceSession.commonId}, skipping chat update`);
    }

    // 9️⃣ Send notifications

    const clientTokens = newClients
      .map(c => c.firebaseToken);
      // .filter((t): t is string => !!t);

    const therapistToken = referenceSession.therapist?.firebaseToken;

    // 🔵 Notify clients (only if tokens exist)
    // if (clientTokens.length > 0) {
      await this.firebaseService.sendPushNotification(
        { client: clientTokens, therapist: [], admin: [] },
        JSON.stringify({ commonId: referenceSession.commonId }),
        SessionNotif.GROUP_SESSION_ADDED,
        `You have been added to all upcoming group sessions in this series.`
      );
    // } else {
    //   this.logger.warn(
    //     `[Notifications] No client tokens found for session ${referenceSession.commonId}`
    //   );
    // }

    // 🟣 Notify therapist (only if token exists)
    // if (therapistToken) {
      await this.firebaseService.sendPushNotification(
        { client: [], therapist: [therapistToken], admin: [] },
        JSON.stringify({ commonId: referenceSession.commonId }),
        SessionNotif.GROUP_SESSION_UPDATED,
        `New clients have been added to your group session.`
      );
    // } else {
    //   this.logger.warn(
    //     `[Notifications] No therapist token found for session ${referenceSession.commonId}`
    //   );
    // }

    return allUpdatedSessions;
  });
  }

  // async addToSession(sessionId: string, dto: AddToSessionDto) {
  //   const { groupClients = [] } = dto;

  //   // We'll run a transaction and then send notifications after commit
  //   const result = await this.sessionRepo.manager.transaction(async (manager) => {
  //     // 1️⃣ Load reference session with relations we need
  //     const referenceSession = await manager.findOne(Session, {
  //       where: { id: sessionId },
  //       relations: [
  //         'client',
  //         'group',
  //         'therapist',
  //         'modal',
  //         'status',
  //         'message',
  //         'groupSubscription',
  //       ],
  //     });

  //     if (!referenceSession) {
  //       throw new NotFoundException(`Session ${sessionId} not found`);
  //     }

  //     if (referenceSession.client != null) {
  //       throw new BadRequestException('Cannot add clients to a 1-on-1 session');
  //     }

  //     if (!referenceSession.commonId) {
  //       throw new BadRequestException('This session is not part of a group series');
  //     }

  //     // 2️⃣ Load clients requested to be added (with their activeSubscription)
  //     const clients = await this.clientService.findAll({ ids: groupClients.join(',') });
  //     const clientsToProcess = clients.data || [];

  //     if (!clientsToProcess.length) {
  //       throw new BadRequestException('No valid clients found');
  //     }

  //     // 3️⃣ Prepare collections to save once
  //     const sessionsToSave: Session[] = [];
  //     const clientsToSave: Client[] = [];
  //     const clientSubscriptionsToSave: ClientSubscription[] = [];
  //     const notificationsToInsert: Notification[] = [];

  //     const now = new Date();

  //     // ensure group arrays are initialized
  //     if (!referenceSession.group) referenceSession.group = [];
  //     if (!referenceSession.groupSubscription) referenceSession.groupSubscription = [];

  //     // 4️⃣ For each client: attach to THIS session only (if not already)
  //     for (const client of clientsToProcess) {
  //       // Ensure client entity includes activeSubscription (best-effort)
  //       // If clientService returned lightweight objects, you may need to re-fetch via manager.findOne(Client,...)
  //       let loadedClient = client;
  //       if (!('activeSubscription' in client)) {
  //         // fetch minimal relations for safety
  //         loadedClient = await manager.findOne(Client, {
  //           where: { id: client.id },
  //           relations: ['activeSubscription', 'activeSubscription.subscription', 'activeSubscription.session'],
  //         }) as Client;
  //         if (!loadedClient) continue; // can't find client — skip
  //       }

  //       // 4.a ensure isInGroup flag persisted
  //       if (!loadedClient.isInGroup) {
  //         loadedClient.isInGroup = true;
  //         clientsToSave.push(loadedClient);
  //       }

  //       const activeSub = loadedClient.activeSubscription;
  //       // If no active subscription, skip or throw depending on policy
  //       if (!activeSub || !activeSub.subscription) {
  //         // skip adding this client (keep behavior consistent)
  //         continue;
  //       }

  //       const sessionDate = new Date(referenceSession.schedule);
  //       const subEnd = activeSub.end_date ? new Date(activeSub.end_date) : null;

  //       // 4.b If subscription covers this session date -> attach
  //       let subToAttach: ClientSubscription | null = null;

  //       if (subEnd && subEnd >= sessionDate) {
  //         subToAttach = activeSub;
  //       } else {
  //         // 4.c Subscription doesn't cover session:
  //         // create an extension subscription that covers exactly this session date
  //         const existingSub = await manager.findOne(ClientSubscription, {
  //           where: {
  //             client: { id: loadedClient.id },
  //             subscription: { id: activeSub.subscription.id },
  //           },
  //           relations: ['client', 'subscription', 'session'],
  //         });

  //         // Create extension sub starting the day after current end (or today if no end) until sessionDate
  //         const extensionStart = subEnd ? new Date(subEnd.getTime() + 1) : new Date();
  //         extensionStart.setHours(0, 0, 0, 0);
  //         const extensionEnd = new Date(sessionDate);
  //         extensionEnd.setHours(23, 59, 59, 999);

  //         const extensionSub = manager.create(ClientSubscription, {
  //           client: loadedClient,
  //           subscription: activeSub.subscription,
  //           start_date: extensionStart,
  //           end_date: extensionEnd,
  //           status: SubscriptionStatus.ACTIVE,
  //         });

  //         // We will save extensionSubs in batch below. Keep ref to attach.
  //         clientSubscriptionsToSave.push(extensionSub);
  //         subToAttach = extensionSub;

  //         // Update client.activeSubscription to the extension for in-memory consistency
  //         loadedClient.activeSubscription = extensionSub;
  //         clientsToSave.push(loadedClient);
  //       }

  //       // 4.d Attach client to session.group if not already
  //       if (!referenceSession.group.find(c => c.id === loadedClient.id)) {
  //         referenceSession.group.push(loadedClient);
  //       }

  //       // 4.e Attach subscription to session.groupSubscription (avoid duplicates)
  //       if (subToAttach) {
  //         const exists = referenceSession.groupSubscription.find(gs => gs && gs.id === subToAttach.id);
  //         if (!exists) {
  //           // If subToAttach is newly created and has no id yet, we still push it — cascade/save later will insert join row
  //           referenceSession.groupSubscription.push(subToAttach as any);
  //         }
  //       }

  //       // 4.f Prepare notification for this client (create entity, will bulk save)
  //       const notif = manager.create(Notification, {
  //         id: this.utilService.generateUuid ? this.utilService.generateUuid() : undefined,
  //         title: 'Session scheduled',
  //         body: 'You have been added to this group session.',
  //         profile: NotificationProfile.CLIENT,
  //         message: JSON.stringify({ sessionId: referenceSession.id }),
  //         code: SessionNotif.SCHEDULED,
  //         isRead: false,
  //         client: loadedClient,
  //         therapist: referenceSession.therapist,
  //       } as any);
  //       notificationsToInsert.push(notif);
  //     } // end clients loop

  //     // 5️⃣ Bulk save everything once (order: subscriptions, clients, session, notifications)
  //     // Save any new/modified clientSubscriptions first so they get ids
  //     if (clientSubscriptionsToSave.length) {
  //       await manager.save(ClientSubscription, clientSubscriptionsToSave);
  //     }

  //     // Save clients that had isInGroup or activeSubscription changed
  //     if (clientsToSave.length) {
  //       await manager.save(Client, clientsToSave);
  //     }

  //     // Now save the reference session (group & groupSubscription changes persisted)
  //     // Use manager.save with the session entity (groupSubscription entries which are persisted will be linked)
  //     const savedSession = await manager.save(Session, referenceSession);

  //     // Bulk insert notifications
  //     if (notificationsToInsert.length) {
  //       await manager.save(Notification, notificationsToInsert);
  //     }

  //     // 6️⃣ Build return payload: ids/tokens for sending push after commit
  //     const clientFirebaseTokens = referenceSession.group
  //       .map(c => (c as any).firebaseToken)
  //       .filter(Boolean) as string[];

  //     const therapistToken = (referenceSession.therapist as any)?.firebaseToken;
  //     const tokens: Tokens = { client: clientFirebaseTokens, therapist: therapistToken ? [therapistToken] : [], admin: [] };

  //     // Return savedSession and tokens to the outer scope (outside transaction) for push
  //     return { savedSession, tokens };
  //   }); // end transaction

  //   // 7️⃣ After transaction commits successfully, send notifications (outside transaction)
  //   try {
  //     if (result?.tokens) {
  //       await this.firebaseService.sendPushNotification(
  //         result.tokens,
  //         JSON.stringify({ sessionId }),
  //         SessionNotif.SCHEDULED,
  //         `You have been added to the session.`
  //       );
  //     }
  //   } catch (e) {
  //     // push failures should not break API success; log but continue
  //     this.logger.error('Failed to send push notification after addToSession', e);
  //   }

  //   // 8️⃣ Return the updated session to caller
  //   return result?.savedSession;
  // }

  // async removeFromSession(sessionId: string, dto: RemoveFromSessionDto) {
  //   return await this.sessionRepo.manager.transaction(async (manager) => {
  //     const { groupClients } = dto; // array of client IDs

  //     // 1️⃣ Load the reference session
  //     const referenceSession = await this.sessionRepo.findOne({
  //       where: { id: sessionId },
  //       relations: ['group', 'therapist'],
  //     });

  //     if (!referenceSession) {
  //       throw new NotFoundException(`Session ${sessionId} not found`);
  //     }

  //     if (!referenceSession.commonId) {
  //       throw new BadRequestException('This session is not part of a group series');
  //     }

  //     // 2️⃣ Find all related sessions
  //     const relatedSessions = await this.sessionRepo.find({
  //       where: { commonId: referenceSession.commonId },
  //       relations: ['group'],
  //       order: { schedule: 'ASC' },
  //     });

  //     if (!relatedSessions.length) {
  //       throw new BadRequestException('No related sessions found for this group');
  //     }

  //     const updatedSessions: Session[] = [];

  //     // 3️⃣ Iterate sessions and remove clients
  //     for (const session of relatedSessions) {
  //       const originalLength = session.group.length;

  //       session.group = session.group.filter(
  //         (c) => !groupClients.includes(c.id),
  //       );

  //       if (session.group.length !== originalLength) {
  //         await manager.save(session);
  //         updatedSessions.push(session);
  //       }
  //     }

  //     // 4️⃣ Update client flags (if no longer in any group)
  //     for (const clientId of groupClients) {
  //       const stillInGroup = await manager
  //         .createQueryBuilder(Session, 'session')
  //         .leftJoin('session.group', 'client')
  //         .where('client.id = :id', { id: clientId })
  //         .getCount();

  //       if (stillInGroup === 0) {
  //         await manager.update(Client, { id: clientId }, { isInGroup: false });
  //       }
  //     }

  //     // 5️⃣ Notify removed clients and therapist
  //     const removedClients = await manager.findByIds(Client, groupClients);
  //     const clientTokens = removedClients.map(c => c.firebaseToken).filter(Boolean);

  //     const tokens: Tokens = { client: [], therapist: [], admin: [] };
  //     if (clientTokens.length) tokens.client.push(...clientTokens);

  //     const therapistToken = referenceSession.therapist?.firebaseToken;
  //     if (therapistToken) tokens.therapist.push(therapistToken);

  //     // await this.firebaseService.sendPushNotification(
  //     //   tokens,
  //     //   JSON.stringify({ commonId: referenceSession.commonId }),
  //     //   SessionNotif.UPDATED,
  //     //   `You have been removed from upcoming group sessions in this group.`
  //     // );

  //     return 'Clients successfully removed from group sessions';
      
  //   });
  // }

  async batchUpdate(dto: BatchUpdateSessionDto) {
    const { commonId, excludedSessionIds = [], updates } = dto;

    if (!updates || Object.keys(updates).length === 0) {
      throw new BadRequestException('No updates provided');
    }

    // const { therapist, schedule, status } = updates;
    const { therapist } = updates;

    const sessions = await this.sessionRepo.find({
      where: {
        commonId,
        id: Not(In(excludedSessionIds)),
      },
      relations: ['client', 'therapist', 'chat'],
    });

    if (!sessions.length) {
      throw new NotFoundException('No sessions found');
    }

    let newTherapist = null;

    if (therapist) {
      newTherapist = await this.therapistService.findOne(therapist);
      if (!newTherapist) throw new NotFoundException('Therapist not found');
    }

    const clientTokens: string[] = [];
    const therapistTokens: string[] = [];
    const prevTherapistTokens: string[] = [];

    const sessionsToUpdate: Session[] = [];

    for (const session of sessions) {
      let changed = false;

      // 🔵 Therapist reassignment
      if (therapist && session.therapist?.id !== therapist) {
        const prevTherapist = session.therapist;

        session.therapist = newTherapist;

        if (session.chat?.id) {
          await this.chatRepo.update(session.chat.id, {
            therapist: newTherapist,
          });
        }

        if (prevTherapist?.firebaseToken) {
          prevTherapistTokens.push(prevTherapist.firebaseToken);
        }

        if (newTherapist?.firebaseToken) {
          therapistTokens.push(newTherapist.firebaseToken);
        }

        changed = true;
      }

      // // 📅 Schedule update
      // if (schedule) {
      //   session.schedule = schedule;
      //   changed = true;
      // }

      // // 📊 Status update
      // if (status) {
      //   const newStatus = this.sessionRepo.manager.create(Status, {
      //     session,
      //     status: status.status,
      //     reason: status.reason,
      //   });

      //   await this.sessionRepo.manager.save(Status, newStatus);

      //   session.latestStatus = status.status;
      //   session.latestReason = status.reason;

      //   changed = true;
      // }

      if (changed) {
        if (session.client?.firebaseToken) {
          clientTokens.push(session.client.firebaseToken);
        }

        sessionsToUpdate.push(session);
      }
    }

    if (!sessionsToUpdate.length) {
      return { message: 'No changes applied' };
    }

    // 💾 Save first
    await this.sessionRepo.save(sessionsToUpdate);

    // // 🔁 Handle reminders AFTER save (important!)
    // if (schedule) {
    //   for (const session of sessionsToUpdate) {
    //     await this.reminderService.cancelReminders(session.id);
    //     await this.reminderService.scheduleReminders(session);
    //   }
    // }

    // 🧼 Deduplicate tokens
    const uniqueClientTokens = [...new Set(clientTokens)].filter(Boolean);
    const uniqueTherapistTokens = [...new Set(therapistTokens)].filter(Boolean);
    const uniquePrevTherapistTokens = [...new Set(prevTherapistTokens)].filter(Boolean);

    const count = sessionsToUpdate.length;

    // 🔔 ONE notification block

    // 🔵 Therapist reassignment
    if (therapist) {
      if (uniqueClientTokens.length) {
        await this.firebaseService.sendPushNotification(
          { client: uniqueClientTokens, therapist: [], admin: [] },
          JSON.stringify({ therapistId: therapist }),
          SessionNotif.TH_REASSIGNED_CLIENT,
          `Your therapist has been updated for ${count} session(s).`
        );
      }

      if (uniquePrevTherapistTokens.length) {
        await this.firebaseService.sendPushNotification(
          { client: [], therapist: uniquePrevTherapistTokens, admin: [] },
          JSON.stringify({ commonId }),
          SessionNotif.TH_REASSIGNED_OLD_THERAPIST,
          `${count} session(s) have been reassigned from you.`
        );
      }

      if (uniqueTherapistTokens.length) {
        await this.firebaseService.sendPushNotification(
          { client: [], therapist: uniqueTherapistTokens, admin: [] },
          JSON.stringify({ commonId }),
          SessionNotif.TH_REASSIGNED_NEW_THERAPIST,
          `You have been assigned to ${count} session(s).`
        );
      }
    }

    // // 📅 Schedule notification
    // if (schedule) {
    //   const etTime = toEthiopianTime(schedule);

    //   await this.firebaseService.sendPushNotification(
    //     {
    //       client: uniqueClientTokens,
    //       therapist: uniqueTherapistTokens,
    //       admin: [],
    //     },
    //     JSON.stringify({ commonId }),
    //     SessionNotif.RE_SCHEDULED,
    //     `Your sessions have been updated for ${etTime}`
    //   );
    // }

    // // 📊 Status notification
    // if (status) {
    //   await this.firebaseService.sendPushNotification(
    //     {
    //       client: uniqueClientTokens,
    //       therapist: uniqueTherapistTokens,
    //       admin: [],
    //     },
    //     JSON.stringify({ commonId }),
    //     SessionNotif.STATUS_CHANGED,
    //     `Session status updated to ${status.status}`
    //   );
    // }

    return {
      updatedCount: count,
      message: 'Batch update successful',
    };
  }

  async updateBatchTherapistNotes(id:string, dto: UpdateGroupSessionNote) {
    return await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(Session, {
        where: { id: id },
        relations: ['group'],
      });

      if (!session) {
        throw new NotFoundException('Group session not found');
      }

      for (const entry of dto.notes) {
        const isClientInGroup = session.group.some(
          (c) => c.id === entry.clientId,
        );

        if (!isClientInGroup) {
          throw new BadRequestException(
            `Client ${entry.clientId} is not part of this group session`,
          );
        }

        let existingNote = await manager.findOne(SessionClientNotes, {
          where: {
            session: { id: id },
            client: { id: entry.clientId },
          },
        });

        if (existingNote) {
          existingNote.note = entry.note;
          await manager.save(existingNote);
        } else {
          const newNote = manager.create(SessionClientNotes, {
            session: { id: id },
            client: { id: entry.clientId },
            note: entry.note,
          });

          await manager.save(newNote);
        }
      }

      return { message: 'Notes updated successfully' };
    });
  }

  async removeFromSession(sessionId: string, dto: RemoveFromSessionDto) {
  return await this.sessionRepo.manager.transaction(async (manager) => {
    const { groupClients } = dto; // array of client IDs

    // 1️⃣ Load reference session
    const referenceSession = await manager.findOne(Session, {
      where: { id: sessionId },
      relations: ['group', 'therapist', 'chat.group'],
    });

    if (!referenceSession) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (!referenceSession.commonId) {
      throw new BadRequestException('This session is not part of a group series');
    }

    // 2️⃣ Load only FUTURE related sessions (same as addToSession)
    const now = new Date();
    // const now = new Date("2025-12-02");

    const relatedSessions = await manager.find(Session, {
      where: {
        commonId: referenceSession.commonId,
        schedule: MoreThan(now),
      },
      relations: ['group', 'groupSubscription', 'groupSubscription.client'],
      order: { schedule: 'ASC' },
    });

    // remove from chat
    if (referenceSession?.chat) {
      
      const chat = referenceSession.chat;

      chat.group = chat.group.filter(
        c => !groupClients.includes(c.id)
      );

      await manager.save(chat);
    }

    if (!relatedSessions.length) {
      throw new BadRequestException('No upcoming related sessions found');
    }

    // 3️⃣ For each session → remove client AND remove subscription
    for (const session of relatedSessions) {
      // Find subscriptions we want to remove based on client IDs
      const subsToRemove = session.groupSubscription.filter(sub =>
        groupClients.includes(sub.client.id)
      );

      const subIdsToRemove = subsToRemove.map(sub => sub.id);

      // Remove clients from the session.group array
      session.group = session.group.filter(
        (c) => !groupClients.includes(c.id)
      );

      // remove subscription from memory array
      // (same sync logic as addToSession but reversed)
      session.groupSubscription = session.groupSubscription.filter(
        (sub) => !groupClients.includes(sub.client.id)
      );

      // Remove the join table entries (M2M)
      if (subIdsToRemove.length > 0) {
        await manager
          .createQueryBuilder()
          .relation(Session, "groupSubscription")
          .of(session.id)             // MUST USE ID, not full object
          .remove(subIdsToRemove);    // Array of subscription IDs
      }

      // Optional: Save session if you need the session.group changes persisted
      await manager.save(session);
    }

    const clients = await manager.find(Client, {
      where: { id: In(groupClients) },
    });

    const clientMap = new Map(clients.map(c => [c.id, c]));
    const etTime = toEthiopianTime(referenceSession.schedule);

    // 4️⃣ Update each client
    for (const clientId of groupClients) {
      const client = clientMap.get(clientId);

      if (!client) {
        this.logger.warn(`Client ${clientId} not found during removal`);
        continue;
      }

      const clientToken = client.firebaseToken;

      const stillInGroup = await manager
        .createQueryBuilder(Session, 'session')
        .leftJoin('session.group', 'client')
        .where('client.id = :id', { id: clientId })
        .andWhere('session.schedule > :now', { now })
        .getCount();

      if (stillInGroup === 0) {
        await manager.update(Client, { id: clientId }, { isInGroup: false });
      }

      // if (clientToken) {
        await this.firebaseService.sendPushNotification(
          { client: [clientToken], therapist: [], admin: [] },
          JSON.stringify({
            sessionId: referenceSession.id,
            commonId: referenceSession.commonId,
            type: 'REMOVED_FROM_GROUP',
          }),
          SessionNotif.GROUP_SESSION_REMOVED,
          `You have been removed from upcoming group sessions scheduled at ${etTime}.`
        );
      // }
    }

    // therapist notification
    const therapistToken = referenceSession?.therapist?.firebaseToken;
  
    // if (therapistToken) {
      await this.firebaseService.sendPushNotification(
        { client: [], therapist: [therapistToken], admin: [] },
        JSON.stringify({
          sessionId: referenceSession.id,
          commonId: referenceSession.commonId,
          removedClientIds: groupClients,
          type: 'GROUP_CLIENTS_REMOVED',
        }),
        SessionNotif.GROUP_SESSION_UPDATED,
        `${groupClients.length} client(s) removed from group session scheduled at ${etTime}.`
      );
    // }

    return 'Clients successfully removed from upcoming group sessions';
  });
}

  async remove(id: string): Promise<void> {
    try {
      const session = await this.sessionRepo.findOne({
        where: {id},
        relations: ['therapist']
      });

      if (!session) {
        throw new NotFoundException(`Session with id ${id} not found`);
      }

      // Remove corresponding availability
      if (session.therapist && session.schedule) {
        await this.availabilityRepo.delete({
          therapist: { id: session.therapist.id },
          schedule: session.schedule,
        });
      }

      // Remove the session itself
      await this.sessionRepo.remove(session);
    } catch (error) {
      this.logger.error(`Failed to remove session: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleTherapistAttendanceCompletion(clientId: string, commonId: string) {
    // Fetch all confirmed sessions for this client
    const sessions = await this.sessionRepo.find({
      where: {
        client: { id: clientId },
        commonId: commonId,
        approvalStatus: ApprovalStatus.CONFIRMED,
      },
      relations: ['client', 'subscription'],
    });

    if (sessions.length === 0) return;

    // Check if all sessions are attended
    const allAttended = sessions.every(s => s.hasTherapistAttended);

    if (!allAttended) return; // Not yet completed — nothing to do

    this.logger.log(`All therapist attendances complete for client ${clientId}`);

    // Mark client subscription inactive
    const clientSub = await this.clientSubscriptionRepo.findOne({
      where: {
        id: sessions[0].subscription.id,
        client: { id: clientId },
      },
      relations: ['client', 'subscription'],
    });

    if (!clientSub) {
      this.logger.warn(`No active subscription found for client ${clientId}`);
      return;
    }

    if (clientSub.status !== SubscriptionStatus.INACTIVE) {
      clientSub.status = SubscriptionStatus.INACTIVE;
      await this.clientSubscriptionRepo.save(clientSub);

      const client = clientSub.client;
      client.activeSubscription = null;
      await this.clientRepo.save(client);

      this.logger.log(
        `ClientSubscription ${clientSub.id} set to INACTIVE and client.activeSubscription cleared`
      );
    }

    // Send Firebase push notification
    const clientToken = sessions[0]?.client?.firebaseToken;
    if (clientToken) {
      await this.firebaseService.sendPushNotification(
        { client: [clientToken], therapist: [], admin: [] },
        JSON.stringify({ message: 'Program complete' }),
        SessionNotif.ALL_SESSIONS_COMPLETED,
        'Your therapist has completed all sessions for your program. Please log out and await your next cycle.'
      );
    }

    this.logger.log(`Client ${clientId} completed all sessions for subscription ${sessions[0].subscription.id}`);
  }
}
