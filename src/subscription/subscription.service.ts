import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, addMonths } from 'date-fns';
import { SubscriptionStatus, SubscriptionType, TokenPayload } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
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

    @InjectRepository(ClientSubscription)
    private clientSubscriptionRepo: Repository<ClientSubscription>,

    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,

    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,

    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, dto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const existingActive = await this.clientSubscriptionRepo.findOne({
        where: {
          client: { id: token.id },
          subscription: { status: SubscriptionStatus.ACTIVE },
        },
        relations: ['subscription'],
      });

      if (existingActive) {
        // throw new BadRequestException('Client already has an active subscription');
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
        level: { id: dto.levelId },
      });
      const savedSub = await this.subscriptionRepo.save(subscription);

      const client = await this.clientRepository.findOne({ where: { id: token.id } });
      const clientSub = this.clientSubscriptionRepo.create({
        client,
        subscription: savedSub,
      });
      await this.clientSubscriptionRepo.save(clientSub);

      return savedSub;
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
      relations: ['client', 'client.client', 'level'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    if ('clientId' in dto && dto.clientId) {
      // Find the existing ClientSubscription for this client
      const existingClientSub = await this.clientSubscriptionRepo.findOne({
        where: {
          subscription: { id: subscription.id },
          client: { id: dto.clientId },
        },
      });

      if (!existingClientSub) {
        // If no existing link, create a new ClientSubscription
        const client = await this.clientRepository.findOne({ where: { id: dto.clientId } });
        if (!client) {
          throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
        }

        const newClientSub = this.clientSubscriptionRepo.create({
          client,
          subscription,
        });

        await this.clientSubscriptionRepo.save(newClientSub);
      }
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

    const startDate = dto.start_date ? new Date(dto.start_date) : subscription.start_date;
    const endDate =
      dto.type != null
        ? dto.type === SubscriptionType.TRIAL
          ? addDays(startDate, 7)
          : addMonths(startDate, dto.type)
        : subscription.end_date;

    subscription.type = dto.type ?? subscription.type;
    subscription.start_date = startDate;
    subscription.end_date = endDate;
    subscription.old_price = dto.old_price ?? subscription.old_price;
    subscription.price = dto.price ?? subscription.price;

    // Handle status change
    if (dto.status && dto.status !== subscription.status) {
      if (dto.status === SubscriptionStatus.ACTIVE) {
        const linkedClients = await this.clientSubscriptionRepo.find({
          where: { subscription: { id: subscription.id } },
          relations: ['client'],
        });

        for (const clientSub of linkedClients) {
          const client = clientSub.client;

          const otherClientSubs = await this.clientSubscriptionRepo.find({
            where: { client: { id: client.id } },
            relations: ['subscription'],
          });

          for (const cs of otherClientSubs) {
            if (cs.subscription.status === SubscriptionStatus.ACTIVE && cs.subscription.id !== subscription.id) {
              cs.subscription.status = SubscriptionStatus.PAUSED;
              await this.subscriptionRepo.save(cs.subscription);
            }
          }

          client.activeSubscription = subscription;
          await this.clientRepository.save(client);
        }
      }

      subscription.status = dto.status;
    }

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
