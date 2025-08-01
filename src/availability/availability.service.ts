import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Availability } from 'src/common/entities/availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { LoggerService } from 'src/logger/logger.service';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { TokenPayload } from 'src/common/constants';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    private readonly logger: LoggerService,
  ) {}

  async create(
    token: TokenPayload,
    dto: CreateAvailabilityDto,
  ): Promise<Availability[]> {
    try {
      if (!Array.isArray(dto.availability)) {
        throw new BadRequestException('Availability must be an array');
      }

      const availabilities = dto.availability.map((item) =>
        this.availabilityRepository.create({
          ...item,
          therapist: { id: token.id },
        }),
      );

      return await this.availabilityRepository.save(availabilities);
    } catch (err) {
      this.logger.error(`Create availability error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.availabilityRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find availabilities: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Availability> {
    try {
      const availability = await new APIFeatures(this.availabilityRepository, queryParams).getOne(id);
      if (!availability) {
        throw new NotFoundException(`Availability with ID ${id} not found`);
      }
      return availability;
    } catch (error) {
      this.logger.error(`Failed to find availability: ${error.message}`);
      throw error;
    }
  }

  async update(
    token: TokenPayload,
    id: string,
    dto: UpdateAvailabilityDto,
  ): Promise<Availability> {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { id },
        relations: ['therapist'],
      });

      if (!availability) {
        throw new NotFoundException(`Availability with ID ${id} not found`);
      }

      if (availability.therapist.id !== token.id) {
        throw new ForbiddenException('You are not authorized to update this availability');
      }

      Object.assign(availability, dto);
      return await this.availabilityRepository.save(availability);
    } catch (err) {
      this.logger.error(`Update availability error: ${err.message}`);
      throw err;
    }
  }

  async remove(token: TokenPayload, id: string): Promise<void> {
    try {
      const availability = await this.availabilityRepository.findOne({
        where: { id },
        relations: ['therapist'],
      });

      if (!availability) {
        throw new NotFoundException(`Availability with ID ${id} not found`);
      }

      if (availability.therapist.id !== token.id) {
        throw new ForbiddenException('You are not allowed to delete this availability');
      }

      await this.availabilityRepository.remove(availability);
    } catch (err) {
      this.logger.error(`Delete availability error: ${err.message}`);
      throw err;
    }
  }
}