import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Preference } from 'src/common/entities/preference.entity';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { TokenPayload } from 'src/common/constants';
import { Modal } from 'src/common/entities/modal.entity';
import { Language } from 'src/common/entities/language.entity';
import { Level } from 'src/common/entities/level.entity';
import { Availability } from 'src/common/entities/availability.entity';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectRepository(Preference) private readonly preferenceRepository: Repository<Preference>,
    @InjectRepository(Modal) private readonly modalRepository: Repository<Modal>,
    @InjectRepository(Language) private readonly languageRepository: Repository<Language>,
    @InjectRepository(Level) private readonly levelRepository: Repository<Level>,
    @InjectRepository(Availability) private readonly availabilityRepository: Repository<Availability>,
    private readonly logger: LoggerService
  ) {}
  async create(client: TokenPayload, dto: CreatePreferenceDto) {
    try {
      const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
      if (!modal) throw new NotFoundException(`Modal ${dto.modalId} not found`);

      const languages = await this.languageRepository.find({
        where: { id: In(dto.languageIds) },
      });

      if (languages.length !== dto.languageIds.length) {
        const foundIds = languages.map(lang => lang.id);
        const missingIds = dto.languageIds.filter(id => !foundIds.includes(id));
        throw new NotFoundException(`Languages not found: ${missingIds.join(', ')}`);
      }

      if (dto.levelId) {
        const level = await this.levelRepository.findOne({ where: { id: dto.levelId } });
        if (!level) throw new NotFoundException(`Level ${dto.levelId} not found`);
      }

      const preference = this.preferenceRepository.create({
        ...dto,
        client: { id: client.id },
        modal: { id: dto.modalId },
        language: dto.languageIds.map(id => ({ id })),
        ...(dto.levelId ? { level: { id: dto.levelId } } : {}),
        ...(dto.availability ? { availability: dto.availability } : {}),
      });

      return await this.preferenceRepository.save(preference);
    } catch (err) {
      this.logger.error(`Create preference error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.preferenceRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find preferences: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Preference> {
    try {
      const preference = await new APIFeatures(this.preferenceRepository, queryParams).getOne(id);
      if (!preference) {
        throw new NotFoundException(`Preference with ID ${id} not found`);
      }
      return preference;
    } catch (error) {
      this.logger.error(`Failed to find preference: ${error.message}`);
      throw error;
    }
  }

  async update(client: TokenPayload, id: string, dto: UpdatePreferenceDto) {
    try {
      const preference = await this.findOne(id);

      if (dto.modalId) {
        const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
        if (!modal) throw new NotFoundException(`Modal ${dto.modalId} not found`);
        preference.modal = modal;
      }

      if (dto.languageIds) {
        const languages = await this.languageRepository.find({
          where: { id: In(dto.languageIds) },
        });

        if (languages.length !== dto.languageIds.length) {
          const foundIds = languages.map(lang => lang.id);
          const missingIds = dto.languageIds.filter(id => !foundIds.includes(id));
          throw new NotFoundException(`Languages not found: ${missingIds.join(', ')}`);
        }

        preference.language = languages;
      }

      if (dto.levelId) {
        const level = await this.levelRepository.findOne({ where: { id: dto.levelId } });
        if (!level) throw new NotFoundException(`Level ${dto.levelId} not found`);
        preference.level = level;
      }

      if (dto.availability) {
        await this.availabilityRepository.delete({ preference: { id: preference.id } });

        const newAvailabilities = dto.availability.map(a =>
          this.availabilityRepository.create({
            day: a.day,
            start_time: a.start_time,
            duration: a.duration,
            timezone: a.timezone,
            preference,
          }),
        );

        preference.availability = newAvailabilities;
      }

      return await this.preferenceRepository.save(preference);
    } catch (err) {
      this.logger.error(`Update preference error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const preference = await this.findOne(id);
      await this.preferenceRepository.remove(preference);
    } catch (err) {
      this.logger.error(`Delete preference error: ${err.message}`);
      throw err;
    }
  }
}