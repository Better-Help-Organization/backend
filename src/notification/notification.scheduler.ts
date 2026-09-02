import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ApprovalStatus, DefaultParameters, SessionNotif, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { Session } from 'src/common/entities/session.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { LoggerService } from 'src/logger/logger.service';
import { ParameterService } from 'src/parameter/parameter.service';
import { Between, LessThan, Repository } from 'typeorm';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationScheduler {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly parameterService: ParameterService,
    private readonly logger: LoggerService,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Therapist) private readonly therapistRepo: Repository<Therapist>,
    @InjectRepository(ClientSubscription) private readonly clientSubscriptionRepo: Repository<ClientSubscription>,
    @InjectRepository(Mood) private readonly moodRepo: Repository<Mood>,
    @InjectRepository(Note) private readonly noteRepo: Repository<Note>,
    @InjectRepository(Diary) private readonly diaryRepo: Repository<Diary>,
  ) {}

    // 1. Daily Mood & Diary reminder (for all active clients)
    @Cron('0 0 6 * * *', { timeZone: 'Africa/Addis_Ababa' }) // every day at 12:00
    async sendMoodAndDiaryReminders() {
        this.logger.log('Checking daily mood & diary entries...');

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const clients = await this.clientRepo
        .createQueryBuilder('client')
        .innerJoinAndSelect('client.activeSubscription', 'activeSub')
        .where('activeSub.status = :status', { status: SubscriptionStatus.ACTIVE })
        .getMany();

        for (const client of clients) {
        if (!client.firebaseToken) continue;

        // Check mood for today
        const moodEntry = await this.moodRepo.findOne({
            where: {
            client: { id: client.id },
            date: Between(startOfDay, endOfDay),
            },
        });

        if (!moodEntry) {
            await this.firebaseService.sendPushNotification(
            { client: [client.firebaseToken], therapist: [], admin: [] },
            'REMINDER',
            SessionNotif.DAILY_MOOD,
            'How was your day? Record your mood now 📝',
            );
        }

        // Check diary for today
        const diaryEntry = await this.diaryRepo.findOne({
            where: {
            client: { id: client.id },
            createdAt: Between(startOfDay, endOfDay),
            },
        });

        if (!diaryEntry) {
            await this.firebaseService.sendPushNotification(
            { client: [client.firebaseToken], therapist: [], admin: [] },
            'REMINDER',
            SessionNotif.DAILY_MOOD,
            'Don’t forget to write in your diary 📔',
            );
        }
        }
    }

    // 2. Session reminders (24h, 2h, 15m before start)
    // @Cron('0 * * * * *', { timeZone: 'Africa/Addis_Ababa' })
    // async sendSessionReminders() {
    //     this.logger.log('Checking upcoming sessions for reminders...');
    //     const now = new Date();

    //     // Map target minutes to specific future timestamps
    //     const targets = [1440, 120, 15]; // 24h, 2h, 15m
        
    //     for (const minutes of targets) {
    //         // Look for sessions scheduled EXACTLY X minutes from now (plus a small 59s window)
    //         const targetTimeStart = new Date(now.getTime() + minutes * 60000);
    //         const targetTimeEnd = new Date(targetTimeStart.getTime() + 59000);

    //         const sessions = await this.sessionRepo.find({
    //             where: { 
    //                 schedule: Between(targetTimeStart, targetTimeEnd) 
    //             },
    //             relations: ['client', 'therapist'],
    //             // Only select the fields you need to save memory
    //             select: {
    //                 id: true,
    //                 schedule: true,
    //                 client: { id: true, firstName: true, firebaseToken: true },
    //                 therapist: { id: true, firstName: true, firebaseToken: true }
    //             }
    //         });

    //         for (const session of sessions) {
    //             const etTime = toEthiopianTime(session.schedule);
                
    //             // Client Notification
    //             if (session.client?.firebaseToken) {
    //                 await this.firebaseService.sendPushNotification(
    //                     { client: [session.client.firebaseToken], therapist: [], admin: [] },
    //                     'SESSION',
    //                     SessionNotif.SESSION_REMINDER_CLIENT,
    //                     `Reminder: You have a session with ${session.therapist?.firstName ?? 'your therapist'} at ${etTime}`,
    //                 );
    //             }

    //             // Therapist Notification
    //             if (session.therapist?.firebaseToken) {
    //                 await this.firebaseService.sendPushNotification(
    //                     { client: [], therapist: [session.therapist.firebaseToken], admin: [] },
    //                     'SESSION',
    //                     SessionNotif.SESSION_REMINDER_THERAPIST,
    //                     `Reminder: You have a session with ${session.client?.firstName ?? 'a client'} at ${etTime}`,
    //                 );
    //             }
    //         }
    //     }
    // }

    // // 3. Therapist note reminder (30 minutes after session ends)
    // @Cron('0 * * * * *', { timeZone: 'Africa/Addis_Ababa' })
    // async sendNoteReminders() {
    //     this.logger.log('Checking for completed sessions needing notes...');
    //     const now = new Date();

    //     const sessions = await this.sessionRepo.find({
    //         where: {
    //             schedule: LessThan(new Date(now.getTime() - 30 * 60 * 1000)), // ended 30m ago
    //         },
    //         relations: ['therapist', 'client'],
    //     });

    //     console.log("Notes: ", sessions);

    //     for (const session of sessions) {
    //         if (session.therapist?.firebaseToken) {
    //             await this.firebaseService.sendPushNotification(
    //             { client: [], therapist: [session.therapist.firebaseToken], admin: [] },
    //             'REMINDER',
    //             SessionNotif.THERAPIST_NOTES,
    //             `Don’t forget to write notes for your session at ${session.schedule.toLocaleString()}`,
    //             );
    //         }
    //     }
    // }

    // 4. Inactivity re-engagement (subscription expired 2 weeks ago)
    // @Cron('0 0 0 * * *', { timeZone: 'Africa/Addis_Ababa' }) // every day at 00:00
    // async sendInactivityReminders() {
    //     this.logger.log('Checking for inactive clients...');
    //     const todayUTC = new Date();
    //     todayUTC.setUTCHours(0, 0, 0, 0); // start of today UTC

    //     const targetDate = new Date(todayUTC);
    //     targetDate.setDate(targetDate.getDate() - 14); // 14 days ago (UTC)

    //     const nextDay = new Date(targetDate);
    //     nextDay.setDate(nextDay.getDate() + 1);

    //     const expiredSubs = await this.clientSubscriptionRepo.find({
    //         where: {
    //             status: SubscriptionStatus.INACTIVE,
    //             end_date: Between(targetDate, nextDay),
    //         },
    //         relations: ['client'],
    //     });

    //     for (const cs of expiredSubs) {
    //         const client = cs.client;
    //         if (client?.firebaseToken) {
    //             await this.firebaseService.sendPushNotification(
    //                 { client: [client.firebaseToken], therapist: [], admin: [] },
    //                 'REMINDER',
    //                 SessionNotif.INACTIVITY,
    //                 'It’s been a while since your last session. Come back and continue your journey.',
    //             );
    //         }
    //     }
    // }

    // 5. Subscription expiry reminder (7 days before)
    // @Cron('0 0 0 * * *', { timeZone: 'Africa/Addis_Ababa' }) // every day at 00:00
    // async sendSubscriptionExpiryReminders() {
    //     this.logger.log('Sending subscription expiry reminders...');

    //     const today = new Date();
    //     today.setUTCHours(0, 0, 0, 0);

    //     const targetStart = new Date(today);
    //     targetStart.setDate(targetStart.getDate() + 7);

    //     const targetEnd = new Date(targetStart);
    //     targetEnd.setUTCHours(23, 59, 59, 999);

    //     const subs = await this.clientSubscriptionRepo.find({
    //         where: {
    //             status: SubscriptionStatus.ACTIVE,
    //             end_date: Between(targetStart, targetEnd),
    //         },
    //         relations: ['client', 'subscription'],
    //     });

    //     for (const cs of subs) {
    //         const client = cs.client;
    //         if (client?.firebaseToken) {
    //             await this.firebaseService.sendPushNotification(
    //                 { client: [client.firebaseToken], therapist: [], admin: [] },
    //                 'EXPIRY',
    //                 SessionNotif.SUBSCRIPTION_EXPIRY,
    //                 `Your subscription will expire on ${cs.end_date}.`,
    //             );
    //         }
    //     }
    // }

    // 6. Subscription expiration day notification
    // @Cron('0 59 23 * * *', { timeZone: 'Africa/Addis_Ababa' })
    // async sendSubscriptionExpiryDayNotification() {
    //     this.logger.log('Checking for subscriptions expiring today...');

    //     const today = new Date();
    //     today.setUTCHours(0, 0, 0, 0);
    //     const tomorrow = new Date(today);
    //     tomorrow.setUTCHours(23, 59, 59, 999);

    //     const expiringToday = await this.clientSubscriptionRepo.find({
    //     where: {
    //         status: SubscriptionStatus.ACTIVE,
    //         end_date: Between(today, tomorrow),
    //     },
    //     relations: ['client'],
    //     });

    //     for (const cs of expiringToday) {
    //     const client = cs.client;
    //     if (client?.firebaseToken) {
    //         await this.firebaseService.sendPushNotification(
    //         { client: [client.firebaseToken], therapist: [], admin: [] },
    //         'SUBSCRIPTION EXPIRED',
    //         SessionNotif.SUBSCRIPTION_EXPIRED,
    //         `Your subscription has expired today. Renew now to continue your sessions.`,
    //         );
    //     }
    //     }

    //     this.logger.log(`Sent expiry notifications for ${expiringToday.length} subscription(s).`);
    // }

  // 7. Pending session cleanup
    @Cron('0 0 0 * * *', { timeZone: 'Africa/Addis_Ababa' })
    async PendingSessionCleanup(): Promise<void> {
        this.logger.log('Starting expired pending sessions cleanup...');

        try {
            // Fetch expiry time from default parameters
            const expiryInMinutes = await this.parameterService.getDefaultByName(
                DefaultParameters.PENDING_SESSION_EXPIRY_IN_MINUTES,
            );

            // Compute expiry threshold
            const now = new Date();
            const expiryThreshold = new Date(now.getTime() - Number(expiryInMinutes) * 60 * 1000);

            this.logger.log(`Removing pending sessions created before: ${expiryThreshold.toISOString()}`);

            // Find sessions older than expiry time and still pending
            const expiredSessions = await this.sessionRepo.find({
                where: {
                approvalStatus: ApprovalStatus.PENDING,
                createdAt: LessThan(expiryThreshold)
                },
                relations: ['client'], // make sure you can access client info
            });

            if (expiredSessions.length === 0) {
                this.logger.log('No expired pending sessions found.');
                return;
            }

            // Delete or update them (depending on your use case)
            await this.sessionRepo.remove(expiredSessions);

            // Extract unique client IDs
            const clientIds = [...new Set(expiredSessions.map(s => s.client.id))];

            // Update hasNotification to null for affected clients
            await Promise.all(clientIds.map(id => this.clientRepo.update(id, { hasNotification: null })));

            // Send notification to each client
            for (const session of expiredSessions) {
                const client = session.client;

                if (client?.firebaseToken) {
                    await this.firebaseService.sendPushNotification(
                    { client: [client.firebaseToken], therapist: [], admin: [] },
                    'Pending session removed',
                    SessionNotif.PENDING_SESSION_DELETED,
                    `Your pending session scheduled on ${session.schedule.toDateString()} was automatically removed due to inactivity.`,
                    );
                }
            }

            this.logger.log(`Removed ${expiredSessions.length} expired pending session(s).`);
        } catch (error) {
        this.logger.error('Error while cleaning expired pending sessions:', error);
        }
    }
}
