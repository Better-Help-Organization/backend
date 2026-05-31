import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentStatus } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Match } from 'src/common/entities/match.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { Session } from 'src/common/entities/session.entity';
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
     @InjectRepository(ClientSubscription)
    private readonly clientSubscriptionRepo: Repository<ClientSubscription>,
     @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
     @InjectRepository(Mood)
    private readonly moodRepo: Repository<Mood>,
     @InjectRepository(Diary)
    private readonly diaryRepo: Repository<Diary>,
    @InjectRepository(Modal)
    private readonly modalRepo: Repository<Modal>,

    @InjectRepository(Preference)
    private readonly preferenceRepo: Repository<Preference>,

  ) {}

  /** 🎭 Users per Modal */
  async getUsersPerModal() {
    return this.preferenceRepo
      .createQueryBuilder('pref')
      .select('modal.name', 'modal')
      .addSelect('COUNT(pref.clientId)', 'userCount')
      .innerJoin('pref.modal', 'modal')
      .groupBy('modal.id')
      .orderBy('userCount', 'DESC')
      .getRawMany();
  }


  /** 👥 Clients stats */
  async getClientStats() {
    const totalClients = await this.clientRepo.count();
    const activeClients = await this.clientRepo.count({ where: { isOnline: true } });
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
    const qb = this.clientSubscriptionRepo
      .createQueryBuilder('sub')
      .innerJoin('sub.payment', 'payment', 'payment.status = :status', {
        status: PaymentStatus.ACCEPTED,
      });

    if (start || end) {
      qb.where('sub.start_date BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    return qb
      .select('COALESCE(SUM(payment.amount), 0)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT sub.id)', 'totalSubscriptions')
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
  const usersPerModal = await this.getUsersPerModal();


  return {
    clientStats,
    therapistStats,
    sessionsOverTime,
    revenueStats,
    matchStats,
    engagementStats,
    usersPerModal
  };
}

}
