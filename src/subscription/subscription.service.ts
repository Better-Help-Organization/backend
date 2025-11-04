import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionNotif, SubscriptionStatus, SubscriptionType, TokenPayload } from 'src/common/constants';
import { ClientSubscription } from 'src/common/entities/client-subscription.entity';
import { Client } from 'src/common/entities/client.entity';
import { Level } from 'src/common/entities/level.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateAdminSubscriptionDto } from './dto/create-admin-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateAdminSubscriptionDto, UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,

    @InjectRepository(ClientSubscription)
    private clientSubscriptionRepo: Repository<ClientSubscription>,

    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,

    @InjectRepository(Preference)
    private readonly preferenceRepository: Repository<Preference>,

    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,

    private readonly logger: LoggerService,

    private readonly firebaseService: FirebaseService,
    
  ) {}

  async createAdminSubscription(dto: CreateAdminSubscriptionDto) {
    const level = await this.levelRepository.findOne({ where: { id: dto.level } });
    if (!level) throw new NotFoundException(`Level ${dto.level} not found`);

    // if (dto.price && dto.price > level.price)
    //   throw new BadRequestException('Price cannot be greater than level price');

    const typeValue = String(SubscriptionType[dto.type]); // '0', '1'

    console.log(dto.type)
    const existing = await this.subscriptionRepo
      .createQueryBuilder('subscription')
      .where('subscription.level = :level', { level: dto.level })
      .andWhere('subscription.type = :type', { type: String(dto.type) }) // ← string!
      .andWhere('subscription.is_admin_created = true')
      .andWhere('subscription.modal = :modal', { modal: dto.modal })
      .getOne();


      // console.log({existing}) 
    if(existing) {
      throw new ConflictException(
        `A ${SubscriptionType[dto.type]} with modal ${existing.modal} and level ${existing.level.type} subscription like this already exists. Update it instead of creating a new one.`
      );
    }

    // return;
    const subscription = this.subscriptionRepo.create({
      type: dto.type,
      old_price: level.price,
      price: dto.price,
      level,
      is_admin_created: true,
      modal: { id: dto.modal }
    });

    return this.subscriptionRepo.save(subscription);
  }

  async create(token: TokenPayload, dto: CreateSubscriptionDto) {
    try {
      const client = await this.clientRepository.findOne({ where: { id: token.id } });
      if (!client) throw new NotFoundException('Client not found');

      const selectedSub = await this.subscriptionRepo.findOne({
        where: { id: dto.subscriptionId, is_admin_created: true },
        relations: ['level'],
      });
      if (!selectedSub) throw new NotFoundException('Admin-created subscription not found');

      const clientSub = this.clientSubscriptionRepo.create({
        client,
        subscription: selectedSub,
        status: SubscriptionStatus.INACTIVE, // will become ACTIVE later
        start_date: null,
        end_date: null,
        old_price: selectedSub.old_price,
        price: selectedSub.price
      });

      const csub = await this.clientSubscriptionRepo.save(clientSub);
      client.activeSubscription = csub
      await this.clientRepository.save(client)
      console.log({client})

      return clientSub;
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

    async findAllUsersubs(queryParams?: FindAllQueryParams, start?: string, end?: string) {
    try {
    const dateFilter = {
      field: 'start_date', // 👈 dynamically choose the date field here
      start,
      end,
    };
      return await new APIFeatures(this.clientSubscriptionRepo, queryParams).getMany({dateFilter});
    } catch (error) {
      this.logger.error(`Failed to find subscriptions: ${error.message}`);
      throw error;
    }
  }

  async findAvailableSubscriptionsByPreference(preferenceId: string) {
    const preference = await this.preferenceRepository.findOne({ 
      where: { id: preferenceId },
      relations: ['level'],
    });
    if (!preference) throw new NotFoundException(`Client Preference ${preferenceId} not found`);

    return this.subscriptionRepo.find({
      where: { level: { id: preference.level.id }, is_admin_created: true},
      relations: ['level'],
    });
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

  async update(token: TokenPayload, id: string, dto: UpdateSubscriptionDto) {
  const subscription = await this.clientSubscriptionRepo.findOne({
    where: { id },
    relations: ['client'], // ✅ make sure we get the client relation
  });

  if (!subscription) {
    throw new NotFoundException(`Subscription with ID ${id} not found`);
  }

  // TODO: Validate price with dto if instances like this are many
  if (dto.old_price && dto.price && dto.price > dto.old_price) {
    throw new BadRequestException('Price cannot be greater than old price');
  }

  // Handle status change
  if (dto.status && dto.status !== subscription.status) {
    if (dto.status === SubscriptionStatus.ACTIVE) {
      const client = subscription.client;
      const now = new Date();
      const durationMonths = subscription.subscription.type;

      // Always set correct start/end first
      subscription.start_date = now;
      subscription.end_date =
        durationMonths === 0
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(new Date(now).setMonth(now.getMonth() + durationMonths));

      // Fetch existing active subscriptions
      const activeClientSubs = await this.clientSubscriptionRepo.find({
        where: { 
          client: { id: client.id },
          status: SubscriptionStatus.ACTIVE
        },
        relations: ['subscription'],
      });

      if (activeClientSubs.length === 0) {
        subscription.status = SubscriptionStatus.ACTIVE;
        client.activeSubscription = subscription;
        await this.clientRepository.save(client);
      } else {
        // Include this one in the comparison
        const candidates = [...activeClientSubs, subscription];

        const latestSub = candidates.reduce((latest, curr) => {
          if (!curr.end_date) return latest;
          if (!latest.end_date) return curr;
          return curr.end_date > latest.end_date ? curr : latest;
        });

        for (const cs of candidates) {
          cs.status = cs.id === latestSub.id
            ? SubscriptionStatus.ACTIVE
            : SubscriptionStatus.PAUSED;

          await this.clientSubscriptionRepo.save(cs);
        }

        client.activeSubscription = latestSub;
        await this.clientRepository.save(client);
      }
    }

    // ✅ Send single push notification for status change
    const client = subscription.client;
    if (client?.firebaseToken) {
      const message = 'Subscription Status Changed';

      const start = subscription.start_date
        ? subscription.start_date.toLocaleDateString()
        : 'N/A';
      const end = subscription.end_date
        ? subscription.end_date.toLocaleDateString()
        : 'N/A';

      const body = `Your subscription is now ${dto.status}. It started on ${start} and will end on ${end}.`;


      await this.firebaseService.sendPushNotification(
        { client: [client.firebaseToken] },
        message,
        SessionNotif.STATUS_CHANGED,
        body
      );
    }

    subscription.status = dto.status;
  }

  // ✅ Save subscription changes
  await this.clientSubscriptionRepo.save(subscription);

  // to return the subscription with updated client:
  const result = await this.clientSubscriptionRepo.findOne({
    where: { id },
    relations: ['client', 'client.activeSubscription', 'subscription', 'subscription.level'],
  });

  return result;
}



  async updateSub(id: string, updateDto: UpdateAdminSubscriptionDto) {
    const sub = await this.findOne(id);
    Object.assign(sub, updateDto);
    try {
      const updated = await this.subscriptionRepo.save(sub);
      this.logger.log(`Updated sub with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating sub: ${error.message}`);
      throw error;
    }
  }

  // async update(token: TokenPayload, id: string, dto: UpdateSubscriptionDto) {
  //   const subscription = await this.clientSubscriptionRepo.findOne({
  //     where: { id },
  //     // relations: ['client', 'client.client', 'level'],
  //   });
  //   let cl = null
  //   if (!subscription) {
  //     throw new NotFoundException(`Subscription with ID ${id} not found`);
  //   }

  //   if ('clientId' in dto && dto.clientId) {
  //     // Find the existing ClientSubscription for this client
  //     const existingClientSub = await this.clientSubscriptionRepo.findOne({
  //       where: {
  //         subscription: { id: subscription.id },
  //         client: { id: dto.clientId },
  //       },
  //     });

  //     if (!existingClientSub) {
  //       // If no existing link, create a new ClientSubscription
  //       const client = await this.clientRepository.findOne({ where: { id: dto.clientId } });
  //       if (!client) {
  //         throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
  //       }

  //       // const newClientSub = this.clientSubscriptionRepo.create({
  //       //   client,
  //       //   subscription,
  //       // });

  //       // await this.clientSubscriptionRepo.save(newClientSub);
  //     }
  //   }

  //   if (dto.old_price && dto.price && dto.price > dto.old_price) {
  //     throw new BadRequestException('Price cannot be greater than old price');
  //   }

  //   // if (dto.levelId && dto.levelId !== subscription.level?.id) {
  //   //   const level = await this.levelRepository.findOne({ where: { id: dto.levelId } });
  //   //   if (!level) {
  //   //     throw new NotFoundException(`Level with ID ${dto.levelId} not found`);
  //   //   }
  //   //   subscription.level = level;
  //   // }

  //   const startDate = dto.start_date ? new Date(dto.start_date) : subscription.start_date;
  //   const endDate =
  //     dto.type != null
  //       ? dto.type === SubscriptionType.TRIAL
  //         ? addDays(startDate, 7)
  //         : addMonths(startDate, dto.type)
  //       : subscription.end_date;

  //   // subscription.type = dto.type ?? subscription.type;
  //   // subscription.start_date = startDate;
  //   // subscription.end_date = endDate;
  //   // subscription.old_price = dto.old_price ?? subscription.old_price;
  //   // subscription.price = dto.price ?? subscription.price;

  //   // Handle status change
  //   if (dto.status && dto.status !== subscription.status) {
  //     cl = client
  //     if (dto.status === SubscriptionStatus.ACTIVE) {
  //       const linkedClients = await this.clientSubscriptionRepo.find({
  //         where: { subscription: { id: subscription.id } },
  //         relations: ['client'],
  //       });
  //       for (const clientSub of linkedClients) {
  //         const client = clientSub.client;
  //         const otherClientSubs = await this.clientSubscriptionRepo.find({
  //           where: { client: { id: client.id } },
  //           relations: ['subscription'],
  //         });

  //         for (const cs of otherClientSubs) {
  //           if (cs.subscription.status === SubscriptionStatus.ACTIVE && cs.subscription.id !== subscription.id) {
  //             cs.subscription.status = SubscriptionStatus.PAUSED;
  //             await this.subscriptionRepo.save(cs.subscription);
  //           }
  //         }

  //         // client.activeSubscription = subscription;
  //         await this.clientRepository.save(client);
  //       }
  //     }

  //     // Send single push notification for any status change
  //     //   if (client.firebaseToken) {
  //     //     const message = 'Subscription Status Changed';
  //     //     const body = `Your subscription is now ${dto.status}.`;

  //     //     await this.firebaseService.sendPushNotification(
  //     //       { client: [client.firebaseToken] },
  //     //       message,
  //     //       SessionNotif.STATUS_CHANGED,
  //     //       body
  //     //     );
  //     //   }
  //     // }

  //     subscription.status = dto.status;
  //     if (cl.) {
  //       const message = 'Subscription Status Changed';
  //       const body = `Your subscription is now ${dto.status}.`;

  //       await this.firebaseService.sendPushNotification(
  //         { client: [client.firebaseToken] },
  //         message,
  //         SessionNotif.STATUS_CHANGED,
  //         body
  //       );
  //       }
  //   }

  //   const csf = this.clientSubscriptionRepo.save(subscription);
  //         // Send single push notification for any status change

  //     // }
  //     return csf
  // }

  async remove(id: string): Promise<void> {
    try {
      await this.subscriptionRepo.softDelete(id);
    } catch (err) {
      this.logger.error(`Delete subscription error: ${err.message}`);
      throw err;
    }
  }
}
