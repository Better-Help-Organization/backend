import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultParameters, ModalName } from 'src/common/constants';
import { Session } from 'src/common/entities/session.entity';
import { ParameterService } from 'src/parameter/parameter.service';
import { Brackets, Repository } from 'typeorm';


@Injectable()
export class TherapistStatisticsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    private readonly paramService: ParameterService
  ) {}

  private appendUniqueGroupSubscription(
    target: { price: number; type: number }[],
    seen: Set<string>,
    subscriptionId: string | null | undefined,
    price: number,
    type: number,
  ) {
    if (!subscriptionId || seen.has(subscriptionId)) return;

    seen.add(subscriptionId);
    target.push({ price, type });
  }

  private appendUniqueAttendance(
    target: string[],
    seen: Set<string>,
    attendanceId: string | null | undefined,
  ) {
    if (!attendanceId || seen.has(attendanceId)) return;

    seen.add(attendanceId);
    target.push(attendanceId);
  }

  /** ⏱️ Total hours (sum of attended session durations, no date filter) */
  async getTotalHours(therapistId?: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .withDeleted()
      .leftJoin('session.groupSubscription', 'gsub')
      .andWhere(new Brackets(qb1 => {
        qb1.where('gsub.id IS NULL AND session.hasTherapistAttended = true')
          .orWhere('gsub.id IS NOT NULL');
      }))
      .andWhere('session.schedule < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 HOUR)');  // ONLY COUNT PAST SESSIONS


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
  // const results = await qb
  //   .select(`DATE(CONVERT_TZ(session.schedule, '+00:00', '+03:00'))) AS date`)
  //   .addSelect('COUNT(session.id) AS count')
  //   .groupBy('DATE(CONVERT_TZ(session.schedule, "+00:00", "+03:00")))')
  //   .orderBy('date', 'ASC')
  //   .getRawMany();
    const results = await qb
    .select(`DATE_ADD(DATE(session.schedule), INTERVAL 1 DAY) AS date`)
    .addSelect('COUNT(session.id)', 'count')
    .groupBy(`DATE_ADD(DATE(session.schedule), INTERVAL 1 DAY)`)
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
        .withDeleted()
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

  async getTotalRevenue(therapistId?: string) {

    const params = await this.paramService.getAllParsedParams();

    // Access them directly from the object
    const ADVANCED = params[DefaultParameters.ADVANCED_PRICE_PERCENTAGE] as number;
    const ASSOCIATE = params[DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE] as number;
    const MODERATE = params[DefaultParameters.MODERATE_PRICE_PERCENTAGE] as number;
    const COUPLE = params[DefaultParameters.COUPLE_PRICE_PERCENTAGE] as number;
    const GROUP = params[DefaultParameters.GROUP_PRICE_PERCENTAGE] as number;
    const VAT = params[DefaultParameters.VAT] as number;

    // 1️⃣ Fetch raw sessions
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .withDeleted()
      .leftJoin('therapist.level', 'level')
      .leftJoin('session.subscription', 'sub')
      .leftJoin('sub.subscription', 'rootsub')
      .leftJoin('session.groupSubscription', 'gsub')
      .leftJoin('gsub.subscription', 'gsubRootSub')
      .leftJoin('session.groupAttendance', 'gatt')
      .innerJoin('session.modal', 'modal')
      .select([
        'sub.price',
        'sub.therapistPercentage',
        'modal.name',
        'level.type',
        'rootsub.type',
        'gsub.price',
        'gsub.therapistPercentage',
        'gsub.id',
        'gsubRootSub.type',
        'session.id',
        'gatt.id'
      ])
      .andWhere(new Brackets(qb1 => {
        qb1.where('gsub.id IS NULL AND session.hasTherapistAttended = true')
          .orWhere('gsub.id IS NOT NULL');
      }))
      .andWhere('session.schedule < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 HOUR)');

    if (therapistId) {
      qb.andWhere('therapist.id = :therapistId', { therapistId });
    }

    const sessions = await qb.getRawMany();

    let totalRevenue = 0;

    const sessionMap = new Map();

    for (const r of sessions) {
      const sid = r.session_id;

      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          subPrice: r.sub_price,
          therapistPercentage: r.sub_therapistPercentage,
          modalName: r.modal_name,
          levelType: r.level_type,
          rootSubType: r.rootsub_type,
          groupSubscriptions: [],
          attendanceList: [],
          groupSubscriptionIds: new Set<string>(),
          attendanceIds: new Set<string>(),
        });
      }

      const sessionEntry = sessionMap.get(sid);
  
      this.appendUniqueGroupSubscription(
        sessionEntry.groupSubscriptions,
        sessionEntry.groupSubscriptionIds,
        r.gsub_id,
        r.gsub_price,
        r.gsubRootSub_type,
      );

      this.appendUniqueAttendance(
        sessionEntry.attendanceList,
        sessionEntry.attendanceIds,
        r.gatt_id,
      );

    }

    for (const entry of sessionMap.values()) {
      const { subPrice, therapistPercentage, modalName, levelType, rootSubType, groupSubscriptions, attendanceList } = entry;

      const sessionPercent = this.getSessionPercentage(
        therapistPercentage,
        modalName,
        levelType,
        { ADVANCED, ASSOCIATE, MODERATE, COUPLE, GROUP }
      );
      console.log({groupSubscriptions})
      const isGroupSession = modalName?.toLowerCase().includes('group');

    if (isGroupSession) {
      // Logic from getRevenueOverTime: Only pay if attendance exists
      if (attendanceList.length > 0 && groupSubscriptions.length > 0) {
        totalRevenue += this.calculateGroupRevenue(groupSubscriptions, sessionPercent, VAT);
      }
    } else {
      // Standard Individual/Couple logic
      const basePrice = (subPrice || 0) / (1 + VAT);
      totalRevenue += this.calculateSessionRevenue(basePrice, sessionPercent, Number(rootSubType));
    }
  }

  return Number(totalRevenue.toFixed(2)) || 0;
  }


  /** 🔍 Therapist workload (scoped to therapist if ID given) */
  async getTherapistWorkload(start: string, end: string, therapistId: string) {
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .withDeleted()
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

    qb.leftJoin('session.groupSubscription', 'gsub')
      .andWhere(new Brackets(qb1 => {
        qb1.where('gsub.id IS NULL AND session.hasTherapistAttended = true')
          .orWhere('gsub.id IS NOT NULL');
      }))

    qb.andWhere('session.schedule < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 HOUR)');


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

    const params: any[] = [];
    let therapistFilter = '';

    if (therapistId) {
      therapistFilter = 'AND s.therapistId = ?';
      params.push(therapistId);
    }

    const result = await this.sessionRepo.manager.query(
      `
      SELECT COUNT(DISTINCT clientId) AS "totalUsers"
      FROM (
        -- Individual sessions
        SELECT s.clientId AS clientId
        FROM session s
        WHERE s.clientId IS NOT NULL
        ${therapistFilter}

        UNION

        -- Group sessions
        SELECT sgc.client_id
        FROM session_group_clients sgc
        JOIN session s ON s.id = sgc.session_id
        WHERE 1=1
        ${therapistFilter}
      ) t
      `,
      params.length ? [...params, ...params] : []
    );

    const totalUsers = Number(result[0]?.totalUsers ?? 0);


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


  private getSessionPercentage(
  therapistPercentage: number | null | undefined,
  modalName: string | null,
  levelType: string | null,
    params: {
      ADVANCED: number;
      ASSOCIATE: number;
      MODERATE: number;
      COUPLE: number;
      GROUP: number;
    }
  ) {
    if (therapistPercentage) return therapistPercentage;

    const lvl = levelType?.toUpperCase();
    if (modalName?.includes(ModalName.COUPLE_THERAPY)) return params.COUPLE;
    if (modalName?.includes(ModalName.GROUP_THERAPY)) return params.GROUP;
    if (lvl === 'ADVANCED') return params.ADVANCED;
    if (lvl === 'ASSOCIATE') return params.ASSOCIATE;
    if (lvl === 'MODERATE') return params.MODERATE;
    return 1;
  }

  private  getSubscriptionDivisor(type: number) {
    switch (type) {
      case 1: return 4;
      case 3: return 12;
      case 6: return 24;
      case 12: return 48;
      default: return 1;
    }
  }

  private  calculateSessionRevenue(basePrice: number, sessionPercent: number, type: number) {
    const divisor = this.getSubscriptionDivisor(type);
    return (basePrice * sessionPercent) / divisor;
  }

  private  calculateGroupRevenue(
    groupSubscriptions: { price: number; type: number }[],
    sessionPercent: number,
    VAT: number
  ) {
    return groupSubscriptions.reduce((sum, gsub) => {
      const price = gsub.price / (1 + VAT);
      return sum + this.calculateSessionRevenue(price, sessionPercent, Number(gsub.type));
    }, 0);
  }

  async getRevenueOverTime(start: string, end: string, therapistId?: string) {

    const params = await this.paramService.getAllParsedParams();

    // Access them directly from the object
    const ADVANCED = params[DefaultParameters.ADVANCED_PRICE_PERCENTAGE] as number;
    const ASSOCIATE = params[DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE] as number;
    const MODERATE = params[DefaultParameters.MODERATE_PRICE_PERCENTAGE] as number;
    const COUPLE = params[DefaultParameters.COUPLE_PRICE_PERCENTAGE] as number;
    const GROUP = params[DefaultParameters.GROUP_PRICE_PERCENTAGE] as number;
    const VAT = params[DefaultParameters.VAT] as number;

    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .withDeleted()
      .leftJoin('therapist.level', 'level')
      .leftJoin('session.subscription', 'sub')
      .leftJoin('sub.subscription', 'rootsub')
      .leftJoin('session.modal', 'modal')
      .leftJoin('session.groupSubscription', 'gsub')
      .leftJoin('session.groupAttendance', 'gatt')
      .leftJoin('gsub.subscription', 'gsubRootSub')
      .select([
        'session.id',
        'session.schedule',
        'sub.price',
        'sub.therapistPercentage',
        'modal.name',
        'level.type',
        'rootsub.type',
        'gsub.price',
        'gsub.id',
        "gatt.id",
        'gsubRootSub.type',
        // 'session.groupAttendance'
      ])
      .andWhere(new Brackets(qb1 => {
        qb1.where('gsub.id IS NULL AND session.hasTherapistAttended = true')
          .orWhere('gsub.id IS NOT NULL');
      }))
      .andWhere('session.schedule < DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 HOUR)');

    if (start && end) {
      qb.andWhere('session.schedule BETWEEN :start AND :end', {
        start: new Date(start),
        end: new Date(end),
      });
    }

    if (therapistId) {
      qb.andWhere('therapist.id = :therapistId', { therapistId });
    }

    const raw = await qb.getRawMany();
    console.log({rawLength: raw.length, raw})
    const sessionMap = new Map();

    for (const r of raw) {
      const sid = r.session_id;

      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          sessionId: sid,
          schedule: r.session_schedule,
          subPrice: r.sub_price,
          therapistPercentage: r.sub_therapistPercentage,
          modalName: r.modal_name,
          levelType: r.level_type,
          rootSubType: r.rootsub_type,
          groupSubscriptions: [],
          attendanceList: [],
          groupSubscriptionIds: new Set<string>(),
          attendanceIds: new Set<string>(),
        });
      }

      const sessionEntry = sessionMap.get(sid);

      this.appendUniqueGroupSubscription(
        sessionEntry.groupSubscriptions,
        sessionEntry.groupSubscriptionIds,
        r.gsub_id,
        r.gsub_price,
        r.gsubRootSub_type,
      );

      this.appendUniqueAttendance(
        sessionEntry.attendanceList,
        sessionEntry.attendanceIds,
        r.gatt_id,
      );
    }

    interface RevenueDayData {
      revenue: number;
      sessionIds: string[];
    }


    // const revenueMap: Record<string, number> = {};
    const revenueMap: Record<string, RevenueDayData> = {};


    for (const entry of sessionMap.values()) {
      const { schedule, subPrice, therapistPercentage, modalName, levelType, rootSubType, groupSubscriptions,attendanceList } = entry;
      const sessionPercent = this.getSessionPercentage(
        therapistPercentage,
        modalName,
        levelType,
        { ADVANCED, ASSOCIATE, MODERATE, COUPLE, GROUP }
      );

      const dateKey = new Date(schedule).toISOString().slice(0, 10);
      let sessionRevenue = 0;

      const isGroupSession = modalName?.toLowerCase().includes('group');

      if (isGroupSession) {
        // For groups: ONLY pay if there is attendance.
        // Also: Only pay for the number of people who actually showed up.
        if (attendanceList.length > 0 && groupSubscriptions.length > 0) {
          console.log("counting group revenue");
          sessionRevenue = this.calculateGroupRevenue(groupSubscriptions, sessionPercent, VAT);
        } else {
          console.log("Group session with no attendance - 0 revenue");
          sessionRevenue = 0; 
        }
      } else {
        // For Individual/Couple: Standard calculation
        const basePrice = (subPrice || 0) / (1 + VAT);
        sessionRevenue = this.calculateSessionRevenue(basePrice, sessionPercent, Number(rootSubType));
      }

      // if (!revenueMap[dateKey]) revenueMap[dateKey] = 0;
      // revenueMap[dateKey] += sessionRevenue;
        if (!revenueMap[dateKey]) {
          revenueMap[dateKey] = {
            revenue: 0,
            sessionIds: []
          };
        }
        revenueMap[dateKey].revenue += sessionRevenue;
        revenueMap[dateKey].sessionIds.push(entry.sessionId);
      }


    // return Object.entries(revenueMap)
    //   .map(([date, revenue]) => ({ 
    //     date, 
    //     revenueOverTime: Number(revenue.toFixed(2)),
    //     sessionIds: data.sessionIds
    //  }))
    //   .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return Object.entries(revenueMap)
      .map(([date, data]) => ({
        date,
        revenueOverTime: Number(data.revenue.toFixed(2)),
        sessionIds: data.sessionIds
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  }

}
