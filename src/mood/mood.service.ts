import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Mood } from 'src/common/entities/mood.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateMoodDto } from './dto/create-mood.dto';
import { UpdateMoodDto } from './dto/update-mood.dto';

@Injectable()
export class MoodService {

  constructor(
    @InjectRepository(Mood) private  mooodRepo:Repository<Mood>,
    private readonly logger: LoggerService,  
  ){}
  
 async create(clientId: string, createMoodDto: CreateMoodDto) {
    const { mood , notes } = createMoodDto;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to midnight so only date part matters

    const existing = await this.mooodRepo.findOne({
      where: { client: { id: clientId }, date: today },
    });

    if (existing) {
      throw new BadRequestException('Mood already recorded for today');
    }

    const newMood = this.mooodRepo.create({
      mood,
      notes,
      date: today,
      client: { id: clientId },
    });

    return await this.mooodRepo.save(newMood);
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.mooodRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Error finding all moods: ${error.message}`);
      return error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Mood> {
  try {
    console.log({id, queryParams})
      const mood = await new APIFeatures(this.mooodRepo, queryParams).getOne(id);
      if (!mood) throw new NotFoundException('Mood not found');
      return mood
    } catch (error) {
      this.logger.error(`Error finding mood: ${error.message}`);
      throw error;
    }
  }


  update(id: number, updateMoodDto: UpdateMoodDto) {
    return `This action updates a #${id} mood`;
  }

  remove(id: number) {
    return `This action removes a #${id} mood`;
  }
}
