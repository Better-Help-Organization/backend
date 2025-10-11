import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from 'src/common/entities/session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TherapistStatisticsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /** 📊 Sessions over time (optionally filter by therapist) */
  async getSessionsOverTime(start: string, end: string, therapistId: string) {
    const qb = this.sessionRepo.createQueryBuilder('session');

    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    return qb
      .select("DATE(session.schedule)", "date")
      .addSelect("COUNT(session.id)", "count")
      .groupBy("DATE(session.schedule)")
      .orderBy("date", "ASC")
      .getRawMany();
  }

  /** 👥 Users treated over time (unique clients per therapist per day) */
  async getUsersTreatedOverTime(start: string, end: string, therapistId: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.client', 'client')
      .leftJoin('session.group', 'groupClients');

    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    return qb
      .select("DATE(session.schedule)", "date")
      .addSelect("COUNT(DISTINCT client.id) + COUNT(DISTINCT groupClients.id)", "treatedUsers")
      .groupBy("DATE(session.schedule)")
      .orderBy("date", "ASC")
      .getRawMany();
  }

  /** 💰 Revenue (sessions * therapist.level.price) */
  async getRevenueOverTime(start: string, end: string, therapistId: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .leftJoin('therapist.level', 'level');

    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    return qb
      .select("DATE(session.schedule)", "date")
      .addSelect("SUM(level.price)", "revenue")
      .groupBy("DATE(session.schedule)")
      .orderBy("date", "ASC")
      .getRawMany();
  }

  /** 🔍 Therapist workload (scoped to therapist if ID given) */
  async getTherapistWorkload(start: string, end: string, therapistId: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .leftJoin('therapist.level', 'level');

    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      });
    }

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    return qb
      .select('therapist.id', 'therapistId')
      .addSelect('CONCAT(therapist.firstName, " ", therapist.lastName)', 'therapistName')
      .addSelect('COUNT(session.id)', 'sessionCount')
      .addSelect('SUM(level.price)', 'revenue')
      .groupBy('therapist.id')
      .orderBy('sessionCount', 'DESC')
      .getRawMany();
  }

  async getAnalyticsOverTime(start: string, end: string, therapistId: string) {
  // total sessions
  // total clients
    const sessionsOverTime = await this.getSessionsOverTime(start, end, therapistId)
    const usersTreatedOverTime = await this.getUsersTreatedOverTime(start, end, therapistId)
    const revenueOverTime = await this.getRevenueOverTime(start, end, therapistId)
    const therapistWorkload = await this.getTherapistWorkload(start, end, therapistId)

  return {
    sessionsOverTime,
    usersTreatedOverTime,
    revenueOverTime,
    therapistWorkload,
  };
}

}

