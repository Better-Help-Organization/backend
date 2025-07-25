import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Status } from 'src/common/entities/status.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateStatusDto } from '../dto/status/create-status.dto';
import { UpdateStatusDto } from '../dto/status/update-status.dto';

@Injectable()
export class StatusService {
  
  constructor (
      @InjectRepository(Status) private statusRepo: Repository<Status>,
      private readonly logger: LoggerService,
    ) {}

  async create(sessionId: string, createStatusDto: CreateStatusDto) {
    this.logger.log('Creating a new status');
    try {
      const newStatus = this.statusRepo.create({
        ...createStatusDto,
        session: { id: sessionId },
      });

      console.log('New Status: - status.service.ts:27', newStatus);
      
      const savedStatus = await this.statusRepo.save(newStatus);
      
      this.logger.log('Status created successfully');

      return savedStatus;
    } catch (error) {
      this.logger.error(`Error creating status: ${error.message}`);
      throw error;
    }
  }
  
  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.statusRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find status: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Status> {
    try {
      const status = await new APIFeatures(this.statusRepo, queryParams).getOne(id);
      if (!status) {
        throw new NotFoundException(`status with ID ${id} not found`);
      }
      return status;
    } catch (error) {
      this.logger.error(`Failed to find status: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateStatusDto: UpdateStatusDto) {
    try {
      const status = await this.findOne(id);
      
      // Extract product ID and other data
      const {...statusData } = updateStatusDto;
      
      // Apply updates to tag entity
      Object.assign(status, statusData);

      const updateStatus = await this.statusRepo.save(status);
      
      this.logger.log(`Status with ID ${id} updated successfully`);

      return updateStatus;
    } catch (error) {
      this.logger.error(`Error updating tag with ID ${id}`, error);
      throw error;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} `;
  }
}
