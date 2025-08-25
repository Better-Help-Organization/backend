import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Therapist } from 'src/common/entities/therapist.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { UpdateTherapistDto } from './dto/update-therapist.dto';

@Injectable()
export class TherapistService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,
  ) {}

  async create(data: Partial<Therapist>) {
    try {
      this.logger.log(`Creating therapist with data: ${JSON.stringify(data)}`);
      const therapist = this.therapistRepo.create({
        ...data,
      });
      const saved = await this.therapistRepo.save(therapist);
      this.logger.log(`Therapist created with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating therapist: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Therapist>) {
    try {
      this.logger.log(`Finding therapist with ID: ${id}`);
      const therapist = await new APIFeatures(this.therapistRepo, queryParams).getOne(id);

      if (!therapist) {
        this.logger.warn(`Therapist not found with ID: ${id}`);
        throw new NotFoundException('Therapist not found');
      }

      this.logger.log(`Therapist found with ID: ${id}`);
      return therapist;
    } catch (error) {
      this.logger.error(`Error finding therapist: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Therapist>) {
    try {
      this.logger.log(`Fetching all therapists`);
      const result = await new APIFeatures(this.therapistRepo, queryParams).getMany();
      this.logger.log(`Found ${result.data.length} therapists`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching therapists: ${error.message}`);
      throw error;
    }
  }

  // async findMatchingTherapists(preference: {
  //   gender: string;
  //   level?: string;
  //   availability: {
  //     day: string;
  //     day_period: string;
  //   }[];
  // }): Promise<Therapist[]> {
  //   const query = this.therapistRepo.createQueryBuilder('therapist')
  //     .leftJoinAndSelect('therapist.availability', 'availability')
  //     .leftJoinAndSelect('therapist.level', 'level');

  //   if (preference.gender) {
  //     query.andWhere('therapist.gender = :gender', { gender: preference.gender });
  //   }

  //   if (preference.level) {
  //     query.andWhere('level.id = :level', { level: preference.level });
  //   }

  //   if (preference.availability?.length) {
  //     const conditions: string[] = [];
  //     const parameters: Record<string, any> = {};

  //     preference.availability.forEach((slot, i) => {
  //       conditions.push(`(
  //         availability.day = :day${i}
  //         AND availability.day_period = :period${i}
  //       )`);

  //       parameters[`day${i}`] = slot.day;
  //       parameters[`period${i}`] = slot.day_period;
  //     });

  //     query.andWhere(conditions.join(' OR '), parameters);
  //   }

  //   const therapists = await query.getMany();

  //   return therapists;
  // }

  async update(id: string, updateDto: UpdateTherapistDto) {
    const therapist = await this.findOne(id);
    Object.assign(therapist, updateDto);
    try {
      const updated = await this.therapistRepo.save(therapist);
      this.logger.log(`Updated therapist with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating therapist: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const therapist = await this.findOne(id);
    try {
      await this.therapistRepo.remove(therapist);
      this.logger.log(`Removed therapist with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error removing therapist: ${error.message}`);
      throw error;
    }
  }

  getRepository(): Repository<Therapist> {
    return this.therapistRepo;
  }

  async setOnline(id: string) {
    await this.therapistRepo.update(id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });
  }

  async setOffline(id: string) {
    await this.therapistRepo.update(id, {
      isOnline: false,
      lastSeenAt: new Date(),
    });
  }
}
