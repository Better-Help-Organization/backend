import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenPayload } from 'src/common/constants';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { Diary } from '../common/entities/diary.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';

@Injectable()
export class DiaryService {

  constructor(
    @InjectRepository(Diary)
    private  diaryRepo:Repository<Diary>,
    private readonly logger: LoggerService,  
  ){}

  async create(user:TokenPayload, createDiaryDto: CreateDiaryDto) {
    try {
      const modal = this.diaryRepo.create({
      ...createDiaryDto,
      client: {id: user.id}
      });
      return await this.diaryRepo.save(modal);
    } catch (err) {
      this.logger.error(`Create diary error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.diaryRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Error finding all diarys: ${error.message}`);
      return error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Diary> {
  try {
    console.log({id, queryParams})
      const diary = await new APIFeatures(this.diaryRepo, queryParams).getOne(id);
      if (!diary) throw new NotFoundException('Diary not found');
      return diary
    } catch (error) {
      this.logger.error(`Error finding diary: ${error.message}`);
      throw error;
    }
  }


  async update(id: string, updateDiaryDto: UpdateDiaryDto) {
    const diary = await this.findOne(id);
    Object.assign(diary, updateDiaryDto);
    try {
      const updated = await this.diaryRepo.save(diary);
      this.logger.log(`Updated diary with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating diary: ${error.message}`);
      throw error;
    }  }

  async remove(id: string) {
    try {
      this.logger.log(`Removing diary with ID: ${id}`);
      const result = await this.diaryRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`diary with ID ${id} not found`);
      }
      this.logger.log(`diary with ID ${id} removed`);
      return `diary removed`;
    } catch (error) {
      this.logger.error(`Error removing diary: ${error.message}`);
      throw error;
    }
  }
}
