import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preference } from 'src/common/entities/preference.entity';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { TokenPayload } from 'src/common/constants';
import { Client } from 'src/common/entities/client.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Language } from 'src/common/entities/language.entity';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectRepository(Preference) private readonly preferenceRepository: Repository<Preference>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Modal) private readonly modalRepository: Repository<Modal>,
    @InjectRepository(Language) private readonly languageRepository: Repository<Language>,
    private readonly logger: LoggerService
  ) {}
  async create(client: TokenPayload, dto: CreatePreferenceDto) {
    try {
      if (dto.clientId !== client.id) {
        throw new UnauthorizedException('You cannot create preferences for other clients.');
      }

      if (dto.clientId) {
        const client = await this.clientRepository.findOne({ where: { id: dto.clientId } });
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
      }

      if (dto.modalId) {
        const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
        if (!modal) throw new NotFoundException(`Modal ${dto.modalId} not found`);
      }

      if (dto.languageId) {
        const language = await this.languageRepository.findOne({ where: { id: dto.languageId } });
        if (!language) throw new NotFoundException(`Language ${dto.languageId} not found`);
      }

      const existing = await this.preferenceRepository.findOne({
        where: {
          client: { id: dto.clientId },
          modal: { id: dto.modalId },
          language: { id: dto.languageId },
        },
      });

      if (existing) {
        throw new BadRequestException('You have already set a preference for this therapy type and language.');
      }

      const preference = this.preferenceRepository.create({
        ...dto,
        client: { id: dto.clientId },
        modal: { id: dto.modalId },
        language: { id: dto.languageId },
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

      if (dto.clientId) {
        if (dto.clientId !== client.id) {
          throw new UnauthorizedException('You cannot update preferences that are not yours.');
        }
        const clientData = await this.clientRepository.findOne({ where: { id: dto.clientId } });
        if (!clientData) throw new NotFoundException(`Client ${dto.clientId} not found`);
      }

      if (dto.modalId) {
        const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
        if (!modal) throw new NotFoundException(`Modal ${dto.modalId} not found`);
      }

      if (dto.languageId) {
        const language = await this.languageRepository.findOne({ where: { id: dto.languageId } });
        if (!language) throw new NotFoundException(`Language ${dto.languageId} not found`);
      }

      const duplicate = await this.preferenceRepository.findOne({
        where: {
          client: { id: dto.clientId },
          modal: { id: dto.modalId },
          language: { id: dto.languageId },
        },
      });

      if (duplicate && duplicate.id !== preference.id) {
        throw new BadRequestException(
          'You already have a preference for this therapy type and language.',
        );
      }

      Object.assign(preference, {...dto, client: { id: dto.clientId }, modal: { id: dto.modalId }, language: { id: dto.languageId },});
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