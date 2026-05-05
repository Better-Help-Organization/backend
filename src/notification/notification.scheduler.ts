import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionNotif, SubscriptionStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Note } from 'src/common/entities/note.entity';
import { LoggerService } from 'src/logger/logger.service';
import { Between, Repository } from 'typeorm';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationScheduler {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly logger: LoggerService,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
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
    // TODO: REMOVE
    @Cron('0 0 0 * * *', { timeZone: 'Africa/Addis_Ababa' }) // every day at 00:00
    async sendInactivityReminders() {
        this.logger.log('Checking for inactive clients...');
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0); // start of today UTC

        const targetDate = new Date(todayUTC);
        targetDate.setDate(targetDate.getDate() - 14); // 14 days ago (UTC)

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const expiredSubs = await this.clientSubscriptionRepo.find({
            where: {
                status: SubscriptionStatus.INACTIVE,
                end_date: Between(targetDate, nextDay),
            },
            relations: ['client'],
        });

        for (const cs of expiredSubs) {
            const client = cs.client;
            if (client?.firebaseToken) {
                await this.firebaseService.sendPushNotification(
                    { client: [client.firebaseToken], therapist: [], admin: [] },
                    'REMINDER',
                    SessionNotif.INACTIVITY,
                    'It’s been a while since your last session. Come back and continue your journey.',
                );
            }
        }
    }

}
