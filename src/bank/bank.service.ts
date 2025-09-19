import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bank } from 'src/common/entities/bank.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BankService {

    constructor(
      @InjectRepository(Bank)
      private readonly bankRepo: Repository<Bank>,
      private readonly logger: LoggerService,
    ) {}

  create(createBankDto: CreateBankDto) {
    try{
      const bank = this.bankRepo.create(createBankDto);
      return this.bankRepo.save(bank);
    } catch (error) {
      this.logger.error(`Error creating bank: ${error.message}`);
      throw error;
    } 
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.bankRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find bank: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Bank> {
    try {
      const bank = await new APIFeatures(this.bankRepo, queryParams).getOne(id);
      if (!bank) {
        throw new NotFoundException(`Bank with ID ${id} not found`);
      }
      return bank;
    } catch (error) {
      this.logger.error(`Failed to find bank: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateBankDto: UpdateBankDto) {
    const bank = await this.findOne(id);
    Object.assign(bank, updateBankDto);
    try {
      const updated = await this.bankRepo.save(bank);
      this.logger.log(`Updated bank with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating bank: ${error.message}`);
      throw error;
    }  }

  async remove(id: string) {
    const bank = await this.findOne(id);
    try {
      await this.bankRepo.remove(bank);
      this.logger.log(`Removed bank with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error removing bank: ${error.message}`);
      throw error;
    }  }
}
