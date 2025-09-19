import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, addMonths } from 'date-fns';
import { SubscriptionStatus, SubscriptionType, TokenPayload } from 'src/common/constants';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,

    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,

    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,

    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, dto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const existingActive = await this.subscriptionRepo.findOne({
        where: { client: { id: token.id } },
        withDeleted: false,
      });

      if (existingActive) {
        throw new BadRequestException('Client already has an active subscription');
      }

      if (dto.price && dto.price > dto.old_price) {
        throw new BadRequestException('Price cannot be greater than old price');
      }

      const level = await this.levelRepository.findOne({
        where: { id: dto.levelId },
      });
      if (!level) {
        throw new NotFoundException(`Level with ID ${dto.levelId} not found`);
      }

      const startDate = new Date(dto.start_date);
      const endDate = dto.type == SubscriptionType.TRIAL ? addDays(startDate, 7) : addMonths(startDate, dto.type);
      const subscription = this.subscriptionRepo.create({
        type: dto.type,
        start_date: startDate,
        end_date: endDate,
        old_price: dto.old_price,
        price: dto.price,
        client: { id: token.id },
        level: { id: dto.levelId },
      });

      return await this.subscriptionRepo.save(subscription);
    } catch (err) {
      this.logger.error(`Create subscription error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.subscriptionRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find subscriptions: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Subscription> {
    try {
      const subscription = await new APIFeatures(this.subscriptionRepo, queryParams).getOne(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to find subscription: ${error.message}`);
      throw error;
    }
  }

  async update(token: TokenPayload, id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id },
      relations: ['client', 'level'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    if ('clientId' in dto && dto.clientId && dto.clientId !== subscription.client?.id) {
      const client = await this.clientRepository.findOne({ where: { id: dto.clientId } });
      if (!client) {
        throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
      }
      subscription.client = client;
    }

    if (dto.old_price && dto.price && dto.price > dto.old_price) {
      throw new BadRequestException('Price cannot be greater than old price');
    }

    if (dto.levelId && dto.levelId !== subscription.level?.id) {
      const level = await this.levelRepository.findOne({ where: { id: dto.levelId } });
      if (!level) {
        throw new NotFoundException(`Level with ID ${dto.levelId} not found`);
      }
      subscription.level = level;
    }

    const startDate = new Date(dto.start_date);
    const endDate = dto.type == SubscriptionType.TRIAL ? addDays(startDate, 7) : addMonths(startDate, dto.type);

    subscription.type = dto.type ?? subscription.type;
    subscription.status = dto.status ?? subscription.status;
    subscription.old_price = dto.old_price ?? subscription.old_price;
    subscription.price = dto.price ?? subscription.price;
    subscription.start_date = dto.start_date
      ? startDate
      : subscription.start_date;
    subscription.end_date = endDate ?? subscription.end_date;

    return this.subscriptionRepo.save(subscription);
  }

  async remove(id: string): Promise<void> {
    try {
      const subscription = await this.findOne(id);

      subscription.status = SubscriptionStatus.CANCELED;
      await this.subscriptionRepo.save(subscription);

      await this.subscriptionRepo.softDelete(id);
    } catch (err) {
      this.logger.error(`Delete subscription error: ${err.message}`);
      throw err;
    }
  }
}
