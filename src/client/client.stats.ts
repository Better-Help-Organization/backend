import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Rating } from 'src/common/entities/rating.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClientStatisticsService {
  constructor(
    @InjectRepository(Mood)
    private readonly moodRepo: Repository<Mood>,
    @InjectRepository(Diary)
    private readonly diaryRepo: Repository<Diary>,
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(ClientSubscription)
    private readonly clientSubscriptionRepo: Repository<ClientSubscription>
  ) {}

/** 😀 Mood entries over time */
async getMoodTrend(clientId: string, start?: string, end?: string) {
  return this.moodRepo.createQueryBuilder('mood')
    .select('DATE(mood.date)', 'date')
    .addSelect('COUNT(mood.id)', 'count')
    .where('mood.clientId = :clientId', { clientId })
    .andWhere('mood.date BETWEEN :start AND :end', {
      start: start ? new Date(start) : new Date('2000-01-01'),
      end: end ? new Date(end) : new Date(),
    })
    .groupBy('DATE(mood.date)')
    .orderBy('date', 'ASC')
    .getRawMany();
}

/** 📔 Diary activity */
  async getDiaryActivity(clientId: string, start?: string, end?: string) {
    return this.diaryRepo.createQueryBuilder('diary')
      .select('DATE(diary.createdAt)', 'date')
      .addSelect('COUNT(diary.id)', 'count')
      .where('diary.clientId = :clientId', { clientId })
      .andWhere('diary.createdAt BETWEEN :start AND :end', {
        start: start ? new Date(start) : new Date('2000-01-01'),
        end: end ? new Date(end) : new Date(),
      })
      .groupBy('DATE(diary.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  /** ⭐ Ratings given by client */
  async getRatingsGiven(clientId: string) {
    return this.ratingRepo.createQueryBuilder('rating')
      .select('COUNT(rating.id)', 'count')
      .addSelect('AVG(rating.value)', 'average')
      .where('rating.clientId = :clientId', { clientId })
      .getRawOne();
  }

async getSubscriptions(clientId: string) {
  return this.clientSubscriptionRepo
    .createQueryBuilder('clientSubscription')
    .innerJoin('clientSubscription.subscription', 'subscription')
    .select([
      'subscription.type AS type',
      'clientSubscription.status AS status',
      'clientSubscription.start_date AS startDate',
      'clientSubscription.end_date AS endDate',
      'subscription.price AS price',
      'subscription.id AS subscriptionId',
      'clientSubscription.id AS clientSubscriptionId',
    ])
    .where('clientSubscription.client = :clientId', { clientId })
    .orderBy('clientSubscription.start_date', 'ASC')
    .getRawMany();
}


  async getClientAnalytics(clientId: string, start?: string, end?: string) {
    
      const moodTrend = await this.getMoodTrend(clientId, start, end)
      const diaryActivity = await this.getDiaryActivity(clientId, start, end)
      const ratingsGiven = await this.getRatingsGiven(clientId)
      const subscriptions = await this.getSubscriptions(clientId)

    return {
      moodTrend,
      diaryActivity,
      ratingsGiven,
      subscriptions,
    };
  }
}