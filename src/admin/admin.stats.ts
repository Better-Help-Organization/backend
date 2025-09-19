import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Match } from 'src/common/entities/match.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Session } from 'src/common/entities/session.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { Between, IsNull, Not, Repository } from 'typeorm';

@Injectable()
export class AdminStatisticsService {
  constructor(
     @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
     @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,
     @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
     @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
     @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
     @InjectRepository(Mood)
    private readonly moodRepo: Repository<Mood>,
     @InjectRepository(Diary)
    private readonly diaryRepo: Repository<Diary>,
  ) {}

  /** 👥 Clients stats */
  async getClientStats() {
    const totalClients = await this.clientRepo.count();
    const activeClients = await this.clientRepo.count({ where: { isVisible: true } });
    const inGroupClients = await this.clientRepo.count({ where: { isInGroup: true } });

    return { totalClients, activeClients, inGroupClients };
  }

  /** 🧑‍⚕️ Therapists stats */
  async getTherapistStats() {
    const totalTherapists = await this.therapistRepo.count();
    const therapistsWithSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .select('DISTINCT session.therapistId')
      .getCount();

    return { totalTherapists, therapistsWithSessions };
  }

  /** 📅 Sessions stats over time */
  async getSessionsOverTime(start?: string, end?: string) {
    const qb = this.sessionRepo.createQueryBuilder('session');

    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    return qb
      .select('DATE(session.schedule)', 'date')
      .addSelect('COUNT(session.id)', 'count')
      .groupBy('DATE(session.schedule)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  /** 💰 Revenue stats */
  async getRevenueStats(start?: string, end?: string) {
    const qb = this.subscriptionRepo.createQueryBuilder('sub');

    if (start || end) {
      qb.where('sub.start_date BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    return qb
      .select('SUM(sub.price)', 'totalRevenue')
      .addSelect('COUNT(sub.id)', 'totalSubscriptions')
      .getRawOne();
  }

  /** 🔗 Matches stats */
  async getMatchStats() {
    const totalMatches = await this.matchRepo.count();
    const acceptedMatches = await this.matchRepo.count({ where: { accepted: Not(IsNull()) } });
    return { totalMatches, acceptedMatches };
  }

  /** 📝 Engagement metrics */
  async getEngagementStats(start?: string, end?: string) {
    const moodCount = await this.moodRepo.count({
      where: {
        date: Between(start ? new Date(start) : new Date('2000-01-01'), end ? new Date(end) : new Date()),
      },
    });
    const diaryCount = await this.diaryRepo.count({
      where: {
        createdAt: Between(start ? new Date(start) : new Date('2000-01-01'), end ? new Date(end) : new Date()),
      },
    });
    return { moodCount, diaryCount };
  }

  /** ⚡ Aggregate all stats in parallel */
async getSystemStats(start?: string, end?: string) {
  const clientStats = await this.getClientStats();
  const therapistStats = await this.getTherapistStats();
  const sessionsOverTime = await this.getSessionsOverTime(start, end);
  const revenueStats = await this.getRevenueStats(start, end);
  const matchStats = await this.getMatchStats();
  const engagementStats = await this.getEngagementStats(start, end);

  return {
    clientStats,
    therapistStats,
    sessionsOverTime,
    revenueStats,
    matchStats,
    engagementStats,
  };
}

}