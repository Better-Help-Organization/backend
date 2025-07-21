import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from 'src/common/entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language) private readonly languageRepository: Repository<Language>,
    private readonly logger: LoggerService
  ) {}
  async create(dto: CreateLanguageDto) {
    try {
      const existing = await this.languageRepository.findOne({
      where: [{ name: dto.name }, { code: dto.code }],
      });

      if (existing) {
        throw new BadRequestException('A language with the same name or code already exists.');
      }

      return await this.languageRepository.save(this.languageRepository.create(dto));
    } catch (err) {
      this.logger.error(`Create language error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.languageRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find languages: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Language> {
    try {
      const language = await new APIFeatures(this.languageRepository, queryParams).getOne(id);
      if (!language) {
        throw new NotFoundException(`Language with ID ${id} not found`);
      }
      return language;
    } catch (error) {
      this.logger.error(`Failed to find language: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateLanguageDto) {
    try {
      const language = await this.findOne(id);

      Object.assign(language, dto);
      return await this.languageRepository.save(language);
    } catch (err) {
      this.logger.error(`Update language error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const language = await this.findOne(id);
      await this.languageRepository.remove(language); 
    } catch (err) {
      this.logger.error(`Delete language error: ${err.message}`);
      throw err;
    }
  }
}