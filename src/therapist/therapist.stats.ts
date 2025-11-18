import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultParameters, ModalName } from 'src/common/constants';
import { Session } from 'src/common/entities/session.entity';
import { ParameterService } from 'src/parameter/parameter.service';
import { Repository } from 'typeorm';


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
      .where('session.hasTherapistAttended = true')    
      .andWhere('session.schedule < NOW()');  // ONLY COUNT PAST SESSIONS


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


  async getSessionsOverTime(start: string | null, end: string | null, therapistId: string | null) {
  const qb = this.sessionRepo.createQueryBuilder('session');

  // Prepare date filters
  if (start || end) {
    qb.where('session.schedule BETWEEN :start AND :end', {
      start: start ? new Date(start).toISOString() : '2000-01-01',  // Default start
      end: end ? new Date(end).toISOString() : new Date().toISOString(),  // Default to now
    });
  }

  if (therapistId) {
    qb.andWhere('session.therapistId = :therapistId', { therapistId });
  }

  // Execute the raw SQL with timezone conversion and add one day
  const results = await qb
    .select(`DATE_ADD(DATE(CONVERT_TZ(session.schedule, '+00:00', '+03:00')), INTERVAL 1 DAY) AS date`)
    .addSelect('COUNT(session.id) AS count')
    .groupBy('DATE_ADD(DATE(CONVERT_TZ(session.schedule, "+00:00", "+03:00")), INTERVAL 1 DAY)')
    .orderBy('date', 'ASC')
    .getRawMany();

  return results.map(r => ({
    date: new Date(r.date).toISOString(),  // Return in UTC
    count: r.count
  }));
}
/** 👥 Users treated over time (unique clients per therapist per day) */
async getUsersTreatedOverTime(start: string | null, end: string | null, therapistId: string | null) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.client', 'client')
      .leftJoin('session.group', 'groupClients');

    // Prepare date filters
    if (start || end) {
      qb.where('session.schedule BETWEEN :start AND :end', {
        start: start ? new Date(start).toISOString() : '2000-01-01', // Default start
        end: end ? new Date(end).toISOString() : new Date().toISOString(), // Default to now
      });
    }

    if (therapistId) {
      qb.andWhere('session.therapistId = :therapistId', { therapistId });
    }

    return qb
      .select("DATE_ADD(DATE(session.schedule), INTERVAL 1 DAY) AS date")  // Add 1 day here
      .addSelect("COUNT(DISTINCT client.id) + COUNT(DISTINCT groupClients.id) AS treatedUsers")
      .groupBy("DATE_ADD(DATE(session.schedule), INTERVAL 1 DAY)")  // Ensure grouping matches
      .orderBy("date", "ASC")
      .getRawMany();
}

async getRevenueOverTime(start: string, end: string, therapistId: string) {
  // Fetch percentage parameters
  const ADVANCED = await this.paramService.getDefaultByName(DefaultParameters.ADVANCED_PRICE_PERCENTAGE) as number;
  const ASSOCIATE = await this.paramService.getDefaultByName(DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE) as number;
  const MODERATE = await this.paramService.getDefaultByName(DefaultParameters.MODERATE_PRICE_PERCENTAGE) as number;
  const COUPLE = await this.paramService.getDefaultByName(DefaultParameters.COUPLE_PRICE_PERCENTAGE) as number;
  const GROUP = await this.paramService.getDefaultByName(DefaultParameters.GROUP_PRICE_PERCENTAGE) as number;

  const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number; 

  const qb = this.sessionRepo.createQueryBuilder('session')
    .innerJoin('session.therapist', 'therapist')
    .innerJoin('therapist.level', 'level')
    .innerJoin('session.subscription', 'sub')
    .leftJoin('sub.subscription', 'rootsub')
    .innerJoin('session.modal', 'modal')
    .where('session.hasTherapistAttended = true');

  // Filter by schedule date
  if (start && end) {
    qb.andWhere('session.schedule BETWEEN :start AND :end', {
      start: new Date(start),
      end: new Date(end),
    });
  }

  // Filter by therapist
  if (therapistId) {
    qb.andWhere('therapist.id = :therapistId', { therapistId });
  }

  qb
    .select(`DATE_ADD(DATE(session.schedule), INTERVAL 1 DAY)`, 'date')
    .addSelect(
      `
      ROUND(
        SUM(
          -- REMOVE VAT
          (COALESCE(sub.price, 0) / (1 + :vat))
          *
          -- APPLY SESSION-TYPE PERCENTAGE
          (
            CASE
              WHEN COALESCE(modal.name, '') LIKE :coupleModal THEN :couple
              WHEN COALESCE(modal.name, '') LIKE :groupModal THEN :group
              WHEN level.type = 'ADVANCED' THEN :advanced
              WHEN level.type = 'ASSOCIATE' THEN :associate
              WHEN level.type = 'MODERATE' THEN :moderate
              ELSE 1
            END
          )
          /
          -- SAFE DIVISION BY SUBSCRIPTION TYPE
          COALESCE(
            CASE rootsub.type
              WHEN 0 THEN 1
              WHEN 1 THEN 4
              WHEN 3 THEN 12
              WHEN 6 THEN 24
              WHEN 12 THEN 48
            END,
            1  -- fallback if null
          )
        ), 2
      )
      `,
      'revenueOverTime'
    )
    .groupBy('date')
    .orderBy('date', 'ASC')
    .setParameters({
      vat: VAT,
      advanced: ADVANCED,
      associate: ASSOCIATE,
      moderate: MODERATE,
      couple: COUPLE,
      group: GROUP,
      coupleModal: ModalName.COUPLE_THERAPY,
      groupModal: ModalName.GROUP_THERAPY,
    });

  return await qb.getRawMany();
}



async getTotalRevenue(therapistId?: string) {
  // Fetch the price percentages for session types
  const ADVANCED_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('ADVANCED_PRICE_PERCENTAGE') as number;
  const ASSOCIATE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('ASSOCIATE_PRICE_PERCENTAGE') as number;
  const COUPLE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('COUPLE_PRICE_PERCENTAGE') as number;
  const GROUP_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('GROUP_PRICE_PERCENTAGE') as number;
  const MODERATE_PRICE_PERCENTAGE = await this.paramService.getDefaultByName('MODERATE_PRICE_PERCENTAGE') as number;

  const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number; 

  console.log({ADVANCED_PRICE_PERCENTAGE, ASSOCIATE_PRICE_PERCENTAGE, COUPLE_PRICE_PERCENTAGE, GROUP_PRICE_PERCENTAGE, MODERATE_PRICE_PERCENTAGE, VAT})
  const qb = this.sessionRepo.createQueryBuilder('session')
    .leftJoin('session.therapist', 'therapist')
    .leftJoin('session.subscription', 'sub')
    .leftJoin('sub.subscription', 'rootsub')
    .leftJoin('therapist.level', 'level')
    .innerJoin('session.modal', 'modal')
    .where('session.hasTherapistAttended = true')
    .andWhere('session.schedule < NOW()');  // ONLY COUNT PAST SESSIONS

  if (therapistId) {
    qb.andWhere('session.therapistId = :therapistId', { therapistId });
  }
  console.log({qb})
  // Apply the session type percentages
  qb.select(`
    ROUND(SUM(
      (
        COALESCE(sub.price, 0) / (1 + :vat)
      )
      *
      (
        CASE
          WHEN modal.name LIKE :coupleModal THEN :couple
          WHEN modal.name LIKE :groupModal THEN :group
          WHEN level.type = 'ADVANCED' THEN :advanced
          WHEN level.type = 'ASSOCIATE' THEN :associate
          WHEN level.type = 'MODERATE' THEN :moderate
          ELSE 1
        END
      )
      /
      COALESCE(
        CASE rootsub.type
          WHEN 0 THEN 1
          WHEN 1 THEN 4
          WHEN 3 THEN 12
          WHEN 6 THEN 24
          WHEN 12 THEN 48
        END,
        1
      )
    ), 2)
  `, 'totalRevenue')
  .setParameters({
    vat: VAT,
    advanced: ADVANCED_PRICE_PERCENTAGE,
    associate: ASSOCIATE_PRICE_PERCENTAGE,
    moderate: MODERATE_PRICE_PERCENTAGE,
    couple: COUPLE_PRICE_PERCENTAGE,
    group: GROUP_PRICE_PERCENTAGE,
    coupleModal: ModalName.COUPLE_THERAPY,
    groupModal: ModalName.GROUP_THERAPY,
  });
  
  const { totalRevenue } = await qb.getRawOne();
  
  console.log({totalRevenue})
  // Convert null to 0 if no sessions
  return Number(totalRevenue) || 'N/A';
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
    console.log({period: { start, end }})
    return {
      period: { start, end },
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

