import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Diary } from 'src/common/entities/diary.entity';
import { Mood } from 'src/common/entities/mood.entity';
import { Rating } from 'src/common/entities/rating.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
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
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>
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

  /** 💳 Subscription history */
  async getSubscriptions(clientId: string) {
    return this.subscriptionRepo.createQueryBuilder('subscription')
      .select('subscription.type', 'type')
      .addSelect('subscription.status', 'status')
      .addSelect('subscription.start_date', 'startDate')
      .addSelect('subscription.end_date', 'endDate')
      .addSelect('subscription.price', 'price')
      .where('subscription.clientId = :clientId', { clientId })
      .orderBy('subscription.start_date', 'ASC')
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