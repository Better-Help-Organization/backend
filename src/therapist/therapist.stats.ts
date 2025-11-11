import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from 'src/common/entities/session.entity';
import { Repository } from 'typeorm';
import { ParameterService } from 'src/parameter/parameter.service';
import { DefaultParameters } from 'src/common/constants';


@Injectable()
export class TherapistStatisticsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly paramService: ParameterService
  ) {}

  /** ⏱️ Total hours (sum of attended session durations, no date filter) */
  async getTotalHours(therapistId?: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .where('session.hasTherapistAttended = true');

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    // Assuming `session.duration` is in minutes
    const { totalMinutes } = await qb
      .select('SUM(session.duration)', 'totalMinutes')
      .getRawOne();

    const totalHours = (Number(totalMinutes) || 0) / 60;
    return Number(totalHours.toFixed(2)); // round to 2 decimals
  }

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

    /** ⏱️ Total hours per week (sum of session durations / 60) */
  async getTotalHoursPerWeek(start: string, end: string, therapistId: string) {
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

    qb.andWhere('session.hasTherapistAttended = true');

    return qb
      .select("YEAR(session.schedule)", "year")
      .addSelect("WEEK(session.schedule)", "week")
      .addSelect("SUM(session.duration) / 60", "totalHours")
      .groupBy("year")
      .addGroupBy("week")
      .orderBy("year", "ASC")
      .addOrderBy("week", "ASC")
      .getRawMany();
  }

async getTotalRevenue(therapistId?: string) {
  // Fetch the price percentages for session types
  const ADVANCED_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('ADVANCED_PRICE_PERCENTAGE') as number;
  const ASSOCIATE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('ASSOCIATE_PRICE_PERCENTAGE') as number;
  const COUPLE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('COUPLE_PRICE_PERCENTAGE') as number;
  const GROUP_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('GROUP_PRICE_PERCENTAGE') as number;
  const MODERATE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('MODERATE_PRICE_PERCENTAGE') as number;

  const qb = this.sessionRepo.createQueryBuilder('session')
    .leftJoin('session.therapist', 'therapist')
    .leftJoin('therapist.level', 'level')
    .where('session.hasTherapistAttended = true');

  if (therapistId) {
    qb.andWhere('session.therapistId = :therapistId', { therapistId });
  }

  // Apply the session type percentages
  qb.select(`SUM(level.price * (
    CASE
      WHEN level.type = 'ADVANCED' THEN :advanced
      WHEN level.type = 'ASSOCIATE' THEN :associate
      WHEN level.type = 'MODERATE' THEN :moderate
      WHEN session.type = 'COUPLE' THEN :couple
      WHEN session.type = 'GROUP' THEN :group
      ELSE 1
    END
  ))`, 'totalRevenue')
  .setParameters({
    advanced: ADVANCED_PRICE_PERCENTAGE,
    associate: ASSOCIATE_PRICE_PERCENTAGE,
    moderate: MODERATE_PRICE_PERCENTAGE,
    couple: COUPLE_PRICE_PERCENTAGE,
    group: GROUP_PRICE_PERCENTAGE,
  });


  const { totalRevenue } = await qb.getRawOne();

  // Convert null to 0 if no sessions
  return Number(totalRevenue) || 0;
}


  // async getTotalRevenue(therapistId?: string) {
  //   const qb = this.sessionRepo.createQueryBuilder('session')
  //     .leftJoin('session.therapist', 'therapist')
  //     .leftJoin('therapist.level', 'level')
  //     .where('session.hasTherapistAttended = true');

  //   if (therapistId) {
  //     qb.andWhere('session.therapist = :therapistId', { therapistId });
  //   }

  //   const per = await this.paramService.getDefaultByName(DefaultParameters.ADVANCED_PRICE_PERCENTAGE)
  //   console.log({per})
  //   const { totalRevenue } = await qb
  //     .select('SUM(level.price)', 'totalRevenue')
  //     .getRawOne();

  //   return Number(totalRevenue) || 0;
  // }

  async getAnalyticsOverTime(start: string, end: string, therapistId: string) {
  // total sessions
  // total clients
    const sessionsOverTime = await this.getSessionsOverTime(start, end, therapistId)
    const usersTreatedOverTime = await this.getUsersTreatedOverTime(start, end, therapistId)
    const revenueOverTime = await this.getRevenueOverTime(start, end, therapistId)
    const therapistWorkload = await this.getTherapistWorkload(start, end, therapistId)
    const therapistHoursPerWeek = await this.getTotalHoursPerWeek(start, end, therapistId)
    const totalRevenue = await this.getTotalRevenue(therapistId);
    const totalHours = await this.getTotalHours(therapistId)

    // 🧮 Get total counts (no date filters)
    const totalSessionsQb = this.sessionRepo.createQueryBuilder('session')
      .select('COUNT(session.id)', 'totalSessions');
    if (therapistId) {
      totalSessionsQb.where('session.therapistId = :therapistId', { therapistId });
    }
    const { totalSessions } = await totalSessionsQb.getRawOne();

    const totalUsersQb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.client', 'client')
      .select('COUNT(DISTINCT client.id)', 'totalUsers');
    if (therapistId) {
      totalUsersQb.where('session.therapistId = :therapistId', { therapistId });
    }
    const { totalUsers } = await totalUsersQb.getRawOne();

    return {
      totalSessions: Number(totalSessions) || 0,
      totalUsers: Number(totalUsers) || 0,
      totalRevenue,
      sessionsOverTime,
      usersTreatedOverTime,
      revenueOverTime,
      therapistWorkload,
      therapistHoursPerWeek,
      totalHours,
    };
  }

}

