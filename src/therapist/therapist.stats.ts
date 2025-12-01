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

  async getRevenueOverTime(start: string, end: string, therapistId?: string) {
  // Fetch percentage parameters
  const ADVANCED = await this.paramService.getDefaultByName(DefaultParameters.ADVANCED_PRICE_PERCENTAGE) as number;
  const ASSOCIATE = await this.paramService.getDefaultByName(DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE) as number;
  const MODERATE = await this.paramService.getDefaultByName(DefaultParameters.MODERATE_PRICE_PERCENTAGE) as number;
  const COUPLE = await this.paramService.getDefaultByName(DefaultParameters.COUPLE_PRICE_PERCENTAGE) as number;
  const GROUP = await this.paramService.getDefaultByName(DefaultParameters.GROUP_PRICE_PERCENTAGE) as number;
  const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number;

  // 1️⃣ Fetch session + group subscription data
  const qb = this.sessionRepo.createQueryBuilder('session')
    .leftJoin('session.therapist', 'therapist')
    .leftJoin('therapist.level', 'level')
    .leftJoin('session.subscription', 'sub')
    .leftJoin('sub.subscription', 'rootsub')
    .leftJoin('session.modal', 'modal')
    .leftJoin('session.groupSubscription', 'gsub') // ⭐ added
    .select([
      'session.id',
      'session.schedule',
      'sub.price',
      'sub.therapistPercentage',
      'modal.name',
      'level.type',
      'rootsub.type',
      'gsub.price' // ⭐ added
    ])
    .where('session.hasTherapistAttended = true');

    // Date filter
    if (start && end) {
      qb.andWhere('session.schedule BETWEEN :start AND :end', {
        start: new Date(start),
        end: new Date(end),
      });
    }

    // Therapist filter
    if (therapistId) {
      qb.andWhere('therapist.id = :therapistId', { therapistId });
    }

    const raw = await qb.getRawMany();

    // Group rows by session.id (because group subscriptions duplicate rows)
    const sessionMap = new Map();

    for (const r of raw) {
      const sid = r.session_id;

      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          schedule: r.session_schedule,
          subPrice: r.sub_price,
          therapistPercentage: r.sub_therapistPercentage,
          modalName: r.modal_name,
          levelType: r.level_type,
          rootSubType: r.rootsub_type,
          groupPrices: []
        });
      }

      // Collect group subscription price if exists
      if (r.gsub_price) {
        sessionMap.get(sid).groupPrices.push(r.gsub_price);
      }
    }

    // 2️⃣ Calculate revenue in JS
    const revenueMap: Record<string, number> = {};

    for (const entry of sessionMap.values()) {
      const {
        schedule,
        subPrice,
        therapistPercentage,
        modalName,
        levelType,
        rootSubType,
        groupPrices
      } = entry;

      const dateKey = new Date(schedule).toISOString().slice(0, 10);

      // --- ⭐ FIX: total subscription price calculation ---
      let totalPrice = 0;

      if (groupPrices.length > 0) {
        // group session → sum of all subscription prices
        totalPrice = groupPrices.reduce((a, b) => a + b, 0);
      } else {
        // normal session → single subscription price
        totalPrice = subPrice || 0;
      }

      // VAT removal
      const basePrice = totalPrice / (1 + VAT);

      // percentage selection
      let sessionPercent = 1;

      const lvl = levelType ? levelType.toUpperCase() : null;

      if (therapistPercentage) {
        sessionPercent = therapistPercentage;
      } else {
        if (modalName?.includes(ModalName.COUPLE_THERAPY)) sessionPercent = COUPLE;
        else if (modalName?.includes(ModalName.GROUP_THERAPY)) sessionPercent = GROUP;
        else if (lvl === 'ADVANCED') sessionPercent = ADVANCED;
        else if (lvl === 'ASSOCIATE') sessionPercent = ASSOCIATE;
        else if (lvl === 'MODERATE') sessionPercent = MODERATE;
      }

      // subscription type divisor
      let divisor = 1;
      const type = Number(rootSubType);

      switch (type) {
        case 0: divisor = 1; break;
        case 1: divisor = 4; break;
        case 3: divisor = 12; break;
        case 6: divisor = 24; break;
        case 12: divisor = 48; break;
        default: divisor = 1;
      }

      const revenue = (basePrice * sessionPercent) / divisor;

      if (!revenueMap[dateKey]) revenueMap[dateKey] = 0;
      revenueMap[dateKey] += revenue;
    }

    // 3️⃣ Convert map → list
    return Object.entries(revenueMap)
      .map(([date, revenue]) => ({
        date,
        revenueOverTime: Number(revenue.toFixed(2))
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // async getRevenueOverTime(start: string, end: string, therapistId?: string) {
  //   // Fetch percentage parameters
  //   const ADVANCED = await this.paramService.getDefaultByName(DefaultParameters.ADVANCED_PRICE_PERCENTAGE) as number;
  //   const ASSOCIATE = await this.paramService.getDefaultByName(DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE) as number;
  //   const MODERATE = await this.paramService.getDefaultByName(DefaultParameters.MODERATE_PRICE_PERCENTAGE) as number;
  //   const COUPLE = await this.paramService.getDefaultByName(DefaultParameters.COUPLE_PRICE_PERCENTAGE) as number;
  //   const GROUP = await this.paramService.getDefaultByName(DefaultParameters.GROUP_PRICE_PERCENTAGE) as number;
  //   const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number;

  //   // 1️⃣ Fetch raw session data
  //   const qb = this.sessionRepo.createQueryBuilder('session')
  //     .leftJoin('session.therapist', 'therapist')
  //     .leftJoin('therapist.level', 'level')
  //     .leftJoin('session.subscription', 'sub')
  //     .leftJoin('sub.subscription', 'rootsub')
  //     .leftJoin('session.modal', 'modal')
  //     .select([
  //       'session.id',
  //       'session.schedule',
  //       'sub.price',
  //       'sub.therapistPercentage',
  //       'modal.name',
  //       'level.type',
  //       'rootsub.type'
  //     ])
  //     .where('session.hasTherapistAttended = true');

  //   // Filter by schedule date
  //   if (start && end) {
  //     qb.andWhere('session.schedule BETWEEN :start AND :end', {
  //       start: new Date(start),
  //       end: new Date(end),
  //     });
  //   }

  //   // Filter by therapist
  //   if (therapistId) {
  //     qb.andWhere('therapist.id = :therapistId', { therapistId });
  //   }

  //   const sessions = await qb.getRawMany();
  //   console.log({therapistId})
  //   // 2️⃣ Calculate revenue in JS
  //   const revenueMap: Record<string, number> = {};
  //   console.log({sessions})
  //   for (const s of sessions) {
  //     const dateKey = new Date(s.session_schedule).toISOString().slice(0, 10); // YYYY-MM-DD

  //     const basePrice = (s.sub_price || 0) / (1 + VAT);
  //     let sessionPercent = 1;;
      
  //     const modalName = s.modal_name || '';
  //     const levelType = s.level_type ? s.level_type.toUpperCase():null;

  //     if (s.therapist_percentage) {
  //         sessionPercent = s.therapist_percentage
  //     }
  //     else {
  //         if (modalName.includes(ModalName.COUPLE_THERAPY)) sessionPercent = COUPLE;
  //         else if (modalName.includes(ModalName.GROUP_THERAPY)) sessionPercent = GROUP;
  //         else if (levelType === 'ADVANCED') sessionPercent = ADVANCED;
  //         else if (levelType === 'ASSOCIATE') sessionPercent = ASSOCIATE;
  //         else if (levelType === 'MODERATE') sessionPercent = MODERATE;
  //     }

  //     let subDivisor = 1;
  //     const rootsubType = Number(s.rootsub_type);
  //     switch (rootsubType) {
  //       case 0: subDivisor = 1; break;
  //       case 1: subDivisor = 4; break;
  //       case 3: subDivisor = 12; break;
  //       case 6: subDivisor = 24; break;
  //       case 12: subDivisor = 48; break;
  //       default: subDivisor = 0;
  //     }

  //     const revenue = (basePrice * sessionPercent) / subDivisor;

  //     if (!revenueMap[dateKey]) revenueMap[dateKey] = 0;
  //     revenueMap[dateKey] += revenue;
  //   }

  //   console.log({revenueMap})
  //   // 3️⃣ Convert map to array sorted by date
  //   const revenueOverTime = Object.entries(revenueMap)
  //     .map(([date, revenue]) => ({ date, revenueOverTime: Number(revenue.toFixed(2)) }))
  //     .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  //   return revenueOverTime;
  // }

  // async getTotalRevenue(therapistId?: string) {
  //   // Fetch percentage parameters
  //   const ADVANCED = await this.paramService.getDefaultByName('ADVANCED_PRICE_PERCENTAGE') as number;
  //   const ASSOCIATE = await this.paramService.getDefaultByName('ASSOCIATE_PRICE_PERCENTAGE') as number;
  //   const MODERATE = await this.paramService.getDefaultByName('MODERATE_PRICE_PERCENTAGE') as number;
  //   const COUPLE = await this.paramService.getDefaultByName('COUPLE_PRICE_PERCENTAGE') as number;
  //   const GROUP = await this.paramService.getDefaultByName('GROUP_PRICE_PERCENTAGE') as number;
  //   const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number;

  //   // 1️⃣ Fetch raw sessions + group subscriptions
  //   const qb = this.sessionRepo.createQueryBuilder('session')
  //     .leftJoin('session.therapist', 'therapist')
  //     .leftJoin('therapist.level', 'level')
  //     .leftJoin('session.subscription', 'sub')
  //     .leftJoin('sub.subscription', 'rootsub')
  //     .leftJoin('session.groupSubscription', 'gsub')
  //     .innerJoin('session.modal', 'modal')
  //     .select([
  //       'session.id AS session_id',
  //       'sub.price AS sub_price',
  //       'sub.therapistPercentage AS sub_therapistPercentage',
  //       'modal.name AS modal_name',
  //       'level.type AS level_type',
  //       'rootsub.type AS rootsub_type',
  //       'gsub.price AS gsub_price',
  //       'gsub.therapistPercentage AS gsub_therapistPercentage'
  //     ])
  //     .where('session.hasTherapistAttended = true')
  //     .andWhere('session.schedule < NOW()');

  //   if (therapistId) {
  //     qb.andWhere('therapist.id = :therapistId', { therapistId });
  //   }

  //   const rows = await qb.getRawMany();

  //   // 2️⃣ Group rows by session
  //   const grouped = new Map();

  //   for (const row of rows) {
  //     const id = row.session_id;

  //     if (!grouped.has(id)) {
  //       grouped.set(id, {
  //         basePrice: row.sub_price || 0,
  //         therapistPercentage: row.sub_therapistPercentage,
  //         modalName: row.modal_name,
  //         levelType: row.level_type?.toUpperCase(),
  //         rootSubType: row.rootsub_type,
  //         groupPrices: [],
  //         groupPercentages: []
  //       });
  //     }

  //     // If session has group subscription rows
  //     if (row.gsub_price) {
  //       grouped.get(id).groupPrices.push(Number(row.gsub_price));
  //       grouped.get(id).groupPercentages.push(row.gsub_therapistPercentage);
  //     }
  //   }

  //   // 3️⃣ Calculate total revenue
  //   let totalRevenue = 0;

  //   for (const s of grouped.values()) {
  //     // A. Determine total subscription price
  //     let totalSubPrice = 0;

  //     if (s.groupPrices.length > 0) {
  //       totalSubPrice = s.groupPrices.reduce((a, b) => a + b, 0);
  //     } else {
  //       totalSubPrice = s.basePrice;
  //     }

  //     const basePrice = totalSubPrice / (1 + VAT);

  //     // B. Determine percentage (therapist's cut)
  //     let sessionPercent = 1;

  //     if (s.therapistPercentage) {
  //       sessionPercent = s.therapistPercentage;
  //     } else {
  //       // fallback rules
  //       if (s.modalName.includes(ModalName.COUPLE_THERAPY)) sessionPercent = COUPLE;
  //       else if (s.modalName.includes(ModalName.GROUP_THERAPY)) sessionPercent = GROUP;
  //       else if (s.levelType === 'ADVANCED') sessionPercent = ADVANCED;
  //       else if (s.levelType === 'ASSOCIATE') sessionPercent = ASSOCIATE;
  //       else if (s.levelType === 'MODERATE') sessionPercent = MODERATE;
  //     }

  //     // C. Determine subscription divisor
  //     let subDivisor = 1;
  //     const t = Number(s.rootSubType);

  //     switch (t) {
  //       case 0: subDivisor = 1; break;
  //       case 1: subDivisor = 4; break;
  //       case 3: subDivisor = 12; break;
  //       case 6: subDivisor = 24; break;
  //       case 12: subDivisor = 48; break;
  //     }

  //     // D. Final revenue
  //     totalRevenue += (basePrice * sessionPercent) / subDivisor;
  //   }

  //   return Number(totalRevenue.toFixed(2)) || 0;
  // }

  async getTotalRevenue(therapistId?: string) {
    // Fetch percentage parameters
    const ADVANCED = await this.paramService.getDefaultByName('ADVANCED_PRICE_PERCENTAGE') as number;
    const ASSOCIATE = await this.paramService.getDefaultByName('ASSOCIATE_PRICE_PERCENTAGE') as number;
    const MODERATE = await this.paramService.getDefaultByName('MODERATE_PRICE_PERCENTAGE') as number;
    const COUPLE = await this.paramService.getDefaultByName('COUPLE_PRICE_PERCENTAGE') as number;
    const GROUP = await this.paramService.getDefaultByName('GROUP_PRICE_PERCENTAGE') as number;
    const VAT = await this.paramService.getDefaultByName(DefaultParameters.VAT) as number;

    // 1️⃣ Fetch raw sessions
    const qb = this.sessionRepo.createQueryBuilder('session')
      .leftJoin('session.therapist', 'therapist')
      .leftJoin('therapist.level', 'level')
      .leftJoin('session.subscription', 'sub')
      .leftJoin('sub.subscription', 'rootsub')
      .leftJoin('session.groupSubscription', 'gsub')
      .innerJoin('session.modal', 'modal')
      .select([
        'sub.price',
        'sub.therapistPercentage',
        'modal.name',
        'level.type',
        'rootsub.type',
        'gsub.price',
        'gsub.therapistPercentage'
      ])
      .where('session.hasTherapistAttended = true')
      .andWhere('session.schedule < NOW()');

    if (therapistId) {
      qb.andWhere('therapist.id = :therapistId', { therapistId });
    }

    const sessions = await qb.getRawMany();

    // 2️⃣ Calculate total revenue in JS
    let totalRevenue = 0;

    for (const s of sessions) {
      const basePrice = (s.sub_price || 0) / (1 + VAT);
      let sessionPercent = 1;

      const modalName = s.modal_name || '';
      const levelType = s.level_type?.toUpperCase();

      if (s.therapist_percentage) {
        sessionPercent = s.therapist_percentage
      }
      else {

        if (modalName.includes(ModalName.COUPLE_THERAPY)) sessionPercent = COUPLE;
        else if (modalName.includes(ModalName.GROUP_THERAPY)) sessionPercent = GROUP;
        else if (levelType === 'ADVANCED') sessionPercent = ADVANCED;
        else if (levelType === 'ASSOCIATE') sessionPercent = ASSOCIATE;
        else if (levelType === 'MODERATE') sessionPercent = MODERATE;
      }

      let subDivisor = 1;
      const rootsubType = Number(s.rootsub_type);
      switch (rootsubType) {
        case 0: subDivisor = 1; break;
        case 1: subDivisor = 4; break;
        case 3: subDivisor = 12; break;
        case 6: subDivisor = 24; break;
        case 12: subDivisor = 48; break;
        default: subDivisor = 1;
      }

      totalRevenue += (basePrice * sessionPercent) / subDivisor;
    }

    return Number(totalRevenue.toFixed(2)) || 0;
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

