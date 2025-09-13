import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Final_Files_Dir, SessionNotif, Tmp_Files_Dir, TokenPayload, ValidFolders } from 'src/common/constants';
import { StatusDto } from 'src/common/dto/status.dto';
import { License } from 'src/common/entities/license.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { UpdateTherapistDto } from './dto/update-therapist.dto';

@Injectable()
export class TherapistService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async create(data: Partial<Therapist>) {
    try {
      this.logger.log(`Creating therapist with data: ${JSON.stringify(data)}`);
      const therapist = this.therapistRepo.create({
        ...data,
      });
      const saved = await this.therapistRepo.save(therapist);
      this.logger.log(`Therapist created with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating therapist: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Therapist>) {
    try {
      this.logger.log(`Finding therapist with ID: ${id}`);
      const therapist = await new APIFeatures(this.therapistRepo, queryParams).getOne(id);

      if (!therapist) {
        this.logger.warn(`Therapist not found with ID: ${id}`);
        throw new NotFoundException('Therapist not found');
      }

      this.logger.log(`Therapist found with ID: ${id}`);
      return therapist;
    } catch (error) {
      this.logger.error(`Error finding therapist: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Therapist>) {
    try {
      this.logger.log(`Fetching all therapists`);
      const result = await new APIFeatures(this.therapistRepo, queryParams).getMany();
      this.logger.log(`Found ${result.data.length} therapists`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching therapists: ${error.message}`);
      throw error;
    }
  }

  // async findMatchingTherapists(preference: {
  //   gender: string;
  //   level?: string;
  //   availability: {
  //     day: string;
  //     day_period: string;
  //   }[];
  // }): Promise<Therapist[]> {
  //   const query = this.therapistRepo.createQueryBuilder('therapist')
  //     .leftJoinAndSelect('therapist.availability', 'availability')
  //     .leftJoinAndSelect('therapist.level', 'level');

  //   if (preference.gender) {
  //     query.andWhere('therapist.gender = :gender', { gender: preference.gender });
  //   }

  //   if (preference.level) {
  //     query.andWhere('level.id = :level', { level: preference.level });
  //   }

  //   if (preference.availability?.length) {
  //     const conditions: string[] = [];
  //     const parameters: Record<string, any> = {};

  //     preference.availability.forEach((slot, i) => {
  //       conditions.push(`(
  //         availability.day = :day${i}
  //         AND availability.day_period = :period${i}
  //       )`);

  //       parameters[`day${i}`] = slot.day;
  //       parameters[`period${i}`] = slot.day_period;
  //     });

  //     query.andWhere(conditions.join(' OR '), parameters);
  //   }

  //   const therapists = await query.getMany();

  //   return therapists;
  // }

  async update(id: string, updateDto: UpdateTherapistDto) {
    const therapist = await this.findOne(id);
    Object.assign(therapist, updateDto);
    try {
      const updated = await this.therapistRepo.save(therapist);
      this.logger.log(`Updated therapist with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating therapist: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const therapist = await this.findOne(id);
    try {
      await this.therapistRepo.remove(therapist);
      this.logger.log(`Removed therapist with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error removing therapist: ${error.message}`);
      throw error;
    }
  }

  getRepository(): Repository<Therapist> {
    return this.therapistRepo;
  }

  async setOnline(id: string) {
    await this.therapistRepo.update(id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });
  }

  async setOffline(id: string) {
    await this.therapistRepo.update(id, {
      isOnline: false,
      lastSeenAt: new Date(),
    });
  }

  async uploadProfile(token: TokenPayload, tmpFileName: string) {
    const therapist = await this.findOne(token.id);
    const ext = path.extname(tmpFileName) || '.jpg';
    const tmpPath = path.join(Tmp_Files_Dir, tmpFileName);

    if (!fs.existsSync(tmpPath)) {
      throw new BadRequestException('Uploaded profile file not found');
    }

    const finalDir = path.join(Final_Files_Dir, ValidFolders.PROFILE);
    fs.mkdirSync(finalDir, { recursive: true });

    const existingFiles = fs
      .readdirSync(finalDir)
      .filter(file => file.startsWith(`${therapist.id}.`));
    for (const file of existingFiles) {
      fs.unlinkSync(path.join(finalDir, file));
    }

    const finalFileName = `${therapist.id}${ext}`;
    const finalPath = path.join(finalDir, finalFileName);

    therapist.profile = path.join(ValidFolders.PROFILE, finalFileName)
    try {
      await this.therapistRepo.save(therapist);

      fs.renameSync(tmpPath, finalPath);

      return path.join(ValidFolders.PROFILE, finalFileName);
    } catch (err) {
      this.logger.error(`Failed to update therapist profile: ${err.message}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      throw new BadRequestException('Profile upload failed. Please try again.');
    }
  }

  async toggleStatus(id: string, status: StatusDto) {
    this.logger.log(`Toggling status for client with ID ${id}`);
    try {
      await this.therapistRepo.update(id, status);
      const {firebaseToken} = await this.findOne(id)
      console.log(firebaseToken,status.status.toLocaleUpperCase())
      const message = `${status.status}`
      const body = `Your account is now ${status.status}`
      await this.firebaseService.sendPushNotification({therapist:[firebaseToken]}, message.toString(),SessionNotif.STATUS_CHAGNED, body);

      this.logger.log(`Status for client with ID ${id} updated successfully`);
      return 'successfully updated';
    } catch (error) {
      this.logger.error(`Error toggling status for client with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  async moveLicenseFile(
    token: TokenPayload,
    tmpFileName: string,
    folder: ValidFolders
  ): Promise<string> {
      const ext = path.extname(tmpFileName) || '.pdf';
      const tmpPath = path.join(Tmp_Files_Dir, tmpFileName);

      if (!fs.existsSync(tmpPath)) {
        throw new BadRequestException('Uploaded license file not found');
      }

      const finalDir = path.join(Final_Files_Dir, folder.toLowerCase());
      fs.mkdirSync(finalDir, { recursive: true });

      // Delete previous file(s) for this therapist + folder
      const existingFiles = fs
        .readdirSync(finalDir)
        .filter(file => file.startsWith(`${token.id}_`));
      for (const file of existingFiles) {
        fs.unlinkSync(path.join(finalDir, file));
      }

      const finalFileName = `${token.id}_${folder.toLowerCase()}${ext}`;
      const finalPath = path.join(finalDir, finalFileName);

      fs.renameSync(tmpPath, finalPath);

      return path.join(folder.toLowerCase(), finalFileName); // relative path to store in DB
}


  async saveDocument(token: TokenPayload, filename: string, folder: ValidFolders, modalId: string): Promise<string> {

      const finalFilePath = await this.moveLicenseFile(token, filename, folder);

      let license = await this.licenseRepo.findOne({
        where: { therapist: { id: token.id } },
      });

      // If no license found, create a new one linked to this therapist
      if (!license) {
        license = this.licenseRepo.create({
          therapist: { id: token.id }, // assumes relation works like this
          modal: { id: modalId }
        });
      }

      switch (folder) {
        case ValidFolders.DEGREE:
          license.degree_certificate = finalFilePath;
          break;
        case ValidFolders.GOV_ID:
          license.government_id = finalFilePath;
          break;
        case ValidFolders.PROFESSIONAL_LICENSE:
          license.professional_license = finalFilePath;
          break;
        case ValidFolders.WORK_EXPERIENCE:
          license.work_experience = finalFilePath;
          break;
        case ValidFolders.SPECIAL_TRAINING:
          license.special_training = finalFilePath;
          break;
        case ValidFolders.LICENCE:
          license.filename = finalFilePath;
          break;
    }
        await this.licenseRepo.save(license);
        return finalFilePath;
  }
}
