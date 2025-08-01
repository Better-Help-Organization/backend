import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from 'src/common/entities/license.entity';
import { LoggerService } from 'src/logger/logger.service';
import { APIFeatures } from 'src/common/middlewares/api-features';
import {
  FindAllQueryParams,
  FindOneQueryParams,
} from 'src/common/middlewares/api-features.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { TokenPayload } from 'src/common/constants';
import { Modal } from 'src/common/entities/modal.entity';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepository: Repository<License>,

    @InjectRepository(Modal)
    private readonly modalRepository: Repository<Modal>,

    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, dto: CreateLicenseDto): Promise<License> {
    try {
      const modal = await this.modalRepository.findOne({
        where: { id: dto.modalId },
      });

      if (!modal) {
        throw new NotFoundException(`Modal with ID ${dto.modalId} not found`);
      }

      const license = this.licenseRepository.create({
        ...dto,
        therapist: { id: token.id },
        modal: { id: dto.modalId },
      });

      return await this.licenseRepository.save(license);
    } catch (err) {
      this.logger.error(`Create license error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.licenseRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find licenses: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<License> {
    try {
      const license = await new APIFeatures(this.licenseRepository, queryParams).getOne(id);
      if (!license) {
        throw new NotFoundException(`License with ID ${id} not found`);
      }
      return license;
    } catch (error) {
      this.logger.error(`Failed to find license: ${error.message}`);
      throw error;
    }
  }

  async update(token: TokenPayload, id: string, dto: UpdateLicenseDto): Promise<License> {
    try {
      const license = await this.licenseRepository.findOne({
        where: { id },
        relations: ['therapist'],
      });

      if (!license) throw new NotFoundException(`License with ID ${id} not found`);
      if (license.therapist.id !== token.id) {
        throw new ForbiddenException('You are not authorized to update this license');
      }

      if(dto.modalId){
        const modal = await this.modalRepository.findOne({
          where: { id: dto.modalId },
        });

        if (!modal) {
          throw new NotFoundException(`Modal with ID ${dto.modalId} not found`);
        }
        license.modal = modal;
      }

      license.license_number = dto.license_number ?? license.license_number;
      license.region = dto.region ?? license.region;
      license.expiration_date = dto.expiration_date
        ? new Date(dto.expiration_date)
        : license.expiration_date;
      license.verified = dto.verified ?? license.verified;

      return await this.licenseRepository.save(license);
    } catch (err) {
      this.logger.error(`Update license error: ${err.message}`);
      throw err;
    }
  }

  async remove(token: TokenPayload, id: string): Promise<void> {
    try {
      const license = await this.licenseRepository.findOne({
        where: { id },
        relations: ['therapist'],
      });

      if (!license) throw new NotFoundException(`License with ID ${id} not found`);
      if (license.therapist.id !== token.id) {
        throw new ForbiddenException('You are not authorized to delete this license');
      }

      await this.licenseRepository.remove(license);
    } catch (err) {
      this.logger.error(`Delete license error: ${err.message}`);
      throw err;
    }
  }
}
