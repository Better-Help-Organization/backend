import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modal } from 'src/common/entities/modal.entity';
import { CreateModalDto } from './dto/create-modal.dto';
import { UpdateModalDto } from './dto/update-modal.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';

@Injectable()
export class ModalService {
  constructor(
    @InjectRepository(Modal) private readonly modalRepository: Repository<Modal>,
    private readonly logger: LoggerService
  ) {}
  async create(dto: CreateModalDto) {
    try {
      const modal = this.modalRepository.create(dto);
      return await this.modalRepository.save(modal);
    } catch (err) {
      this.logger.error(`Create modal error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.modalRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find modals: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Modal> {
    try {
      const modal = await new APIFeatures(this.modalRepository, queryParams).getOne(id);
      if (!modal) {
        throw new NotFoundException(`Modal with ID ${id} not found`);
      }
      return modal;
    } catch (error) {
      this.logger.error(`Failed to find modal: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateModalDto) {
    try {
      const modal = await this.findOne(id);
      Object.assign(modal, dto);
      return await this.modalRepository.save(modal);
    } catch (err) {
      this.logger.error(`Update modal error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const modal = await this.findOne(id);
      await this.modalRepository.remove(modal);
    } catch (err) {
      this.logger.error(`Delete modal error: ${err.message}`);
      throw err;
    }
  }
}