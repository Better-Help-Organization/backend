import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Therapist } from 'src/common/entities/therapist.entity';
import { Repository } from 'typeorm';
import { LoggerService } from 'src/logger/logger.service';
import { CreateTherapistDto } from './dto/create-therapist.dto';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';

@Injectable()
export class TherapistService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,
  ) {}

  async create(data: Partial<Therapist>): Promise<Therapist> {
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

  async findOne(id: string, queryParams?: FindOneQueryParams<Therapist>): Promise<Therapist> {
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

  async findAll(queryParams?: FindAllQueryParams<Therapist>): Promise<Therapist[]> {
    try {
      this.logger.log(`Fetching all therapists`);
      const result = await new APIFeatures(this.therapistRepo, queryParams).getMany();
      this.logger.log(`Found ${result.data.length} therapists`);
      return result.data;
    } catch (error) {
      this.logger.error(`Error fetching therapists: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateTherapistDto): Promise<Therapist> {
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
}
