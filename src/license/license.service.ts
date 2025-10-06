import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Final_Files_Dir, Tmp_Files_Dir, TokenPayload, ValidFolders } from 'src/common/constants';
import { License } from 'src/common/entities/license.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import {
  FindAllQueryParams,
  FindOneQueryParams,
} from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

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

      const tmpFileName = dto.filename;
      const ext = path.extname(tmpFileName ?? '');

      if (!tmpFileName) {
        throw new BadRequestException('No uploaded file associated with this request');
      }

      const tmpPath = path.join(Tmp_Files_Dir, tmpFileName);
      if (!fs.existsSync(tmpPath)) {
        throw new BadRequestException('Uploaded file does not exist or was already processed');
      }

      const filenameParts = tmpFileName.split('_');
      if (filenameParts.length < 3) {
        throw new BadRequestException('Uploaded file name format is invalid');
      }

      const modalIdInFilename = filenameParts[1];
      if (modalIdInFilename !== dto.modalId) {
        throw new BadRequestException(`modalId mismatch. Expected: ${dto.modalId} in file name, found: ${modalIdInFilename}`);
      }

      const license = this.licenseRepository.create({
        ...dto,
        therapist: { id: token.id },
        modal: { id: dto.modalId },
      });

      const savedLicense = await this.licenseRepository.save(license);

      const finalFileName = `${token.id}_${dto.modalId}_${savedLicense.id}${ext}`;
      const finalPath = path.join(Final_Files_Dir, ValidFolders.LICENCE, finalFileName);

      fs.mkdirSync(path.dirname(finalPath), { recursive: true });
      fs.renameSync(tmpPath, finalPath);

      savedLicense.filename = finalFileName;
      return await this.licenseRepository.save(savedLicense);
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
        relations: ['therapist', 'modal'],
      });

      if (!license) {
        throw new NotFoundException(`License with ID ${id} not found`);
      }

      // if (license.therapist.id !== token.id) {
      //   throw new ForbiddenException('You are not authorized to update this license');
      // }

      if (dto.filename) {
        const filenameParts = dto.filename.split('_');
        if (filenameParts.length < 3) {
          throw new BadRequestException('Uploaded file name format is invalid');
        }

        const modalIdInFilename = filenameParts[1];
        const resolvedModalId = dto.modalId ?? license.modal.id;

        if (modalIdInFilename !== resolvedModalId) {
          throw new BadRequestException(`modalId mismatch. Expected: ${resolvedModalId} in file name, found: ${modalIdInFilename}`);
        }

        const tmpPath = path.join(Tmp_Files_Dir, dto.filename);
        if (!fs.existsSync(tmpPath)) {
          throw new BadRequestException('Uploaded replacement file not found');
        }

        const ext = path.extname(dto.filename) || '.bin';
        const newFileName = `${token.id}_${resolvedModalId}_${license.id}${ext}`;
        const finalPath = path.join(Final_Files_Dir, ValidFolders.LICENCE, newFileName);

        if (license.filename) {
          const oldPath = path.join(Final_Files_Dir, ValidFolders.LICENCE, license.filename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        fs.renameSync(tmpPath, finalPath);
        console.log("licence name: - license.service.ts:156", newFileName)
        license.filename = newFileName;
      }

      if (dto.modalId && dto.modalId !== license?.modal?.id) {
        const foundModal = await this.modalRepository.findOne({
          where: { id: dto.modalId },
        });

        if (!foundModal) {
          throw new NotFoundException(`Modal with ID ${dto.modalId} not found`);
        }

        license.modal = foundModal;
      }

      license.license_number = dto.license_number ?? license.license_number;
      license.region = dto.region ?? license.region;
      license.expiration_date = dto.expiration_date
        ? new Date(dto.expiration_date)
        : license.expiration_date;

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

      if (license.filename) {
        const filePath = path.join(Final_Files_Dir, ValidFolders.LICENCE, license.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            this.logger.warn(`Failed to delete file: ${filePath}. Error: ${fileErr.message}`);
            throw new BadRequestException(`Could not delete associated file: ${filePath}`);
          }
        } else {
            throw new NotFoundException(`Associated file for license not found: ${filePath}`);
        }
      }

      await this.licenseRepository.remove(license);
    } catch (err) {
      this.logger.error(`Delete license error: ${err.message}`);
      throw err;
    }
  }
}
