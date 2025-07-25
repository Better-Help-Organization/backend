import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Level } from 'src/common/entities/level.entity';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';

@Injectable()
export class LevelService {
  constructor(
    @InjectRepository(Level)
    private readonly levelRepository: Repository<Level>,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateLevelDto): Promise<Level> {
    try {
      const level = this.levelRepository.create(dto);
      return await this.levelRepository.save(level);
    } catch (err) {
      this.logger.error(`Create level error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.levelRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find levels: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Level> {
    try {
      const level = await new APIFeatures(this.levelRepository, queryParams).getOne(id);
      if (!level) {
        throw new NotFoundException(`Level with ID ${id} not found`);
      }
      return level;
    } catch (error) {
      this.logger.error(`Failed to find level: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateLevelDto): Promise<Level> {
    try {
      const level = await this.findOne(id);

      Object.assign(level, dto);
      return await this.levelRepository.save(level);
    } catch (err) {
      this.logger.error(`Update level error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const level = await this.findOne(id);
      await this.levelRepository.remove(level);
    } catch (err) {
      this.logger.error(`Delete level error: ${err.message}`);
      throw err;
    }
  }
}