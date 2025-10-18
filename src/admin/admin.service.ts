import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Final_Files_Dir, Tmp_Files_Dir, TokenPayload, ValidFolders } from 'src/common/constants';
import { Admin } from 'src/common/entities/admin.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) {}

  async create(data: Partial<Admin>) {
    try {
      this.logger.log(`Creating admin with data: ${JSON.stringify(data)}`);
      const user = this.adminRepo.create(data);
      const savedAdmin = await this.adminRepo.save(user);
      this.logger.log(`Admin created with ID: ${savedAdmin.id}`);
      return savedAdmin;
    } catch (error) {
      this.logger.error(`Error creating admin: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Admin>) {
    try {
      this.logger.log(`Finding user with ID: ${id}`);
      const user = await new APIFeatures(this.adminRepo, queryParams).getOne(id);

      if (!user) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException('Admin not found');
      }

      this.logger.log(`User found with ID: ${id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error finding user with ID: ${id} - ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Admin>) {
    try {
      this.logger.log(`Finding all admins with query params: ${JSON.stringify(queryParams)}`);
      const admin = await new APIFeatures(this.adminRepo, queryParams).getMany();
      this.logger.log(`Found admins`);
      return admin.data;
    } catch (error) {
      this.logger.error(`Error finding all admins: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateAdminDto) {
    const admin = await this.findOne(id);
    Object.assign(admin, updateDto);
    try {
      const updated = await this.adminRepo.save(admin);
      this.logger.log(`Updated admin with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating admin: ${error.message}`);
      throw error;
    }
  }

    async uploadProfile(token: TokenPayload, tmpFileName: string) {
      const client = await this.findOne(token.id);
      const ext = path.extname(tmpFileName) || '.jpg';
      const tmpPath = path.join(Tmp_Files_Dir, tmpFileName);
  
      if (!fs.existsSync(tmpPath)) {
        throw new BadRequestException('Uploaded profile file not found');
      }
  
      const finalDir = path.join(Final_Files_Dir, ValidFolders.PROFILE);
      fs.mkdirSync(finalDir, { recursive: true });
  
      const existingFiles = fs
        .readdirSync(finalDir)
        .filter(file => file.startsWith(`${client.id}.`));
      for (const file of existingFiles) {
        fs.unlinkSync(path.join(finalDir, file));
      }
  
      const finalFileName = `${client.id}${ext}`;
      const finalPath = path.join(finalDir, finalFileName);
  
      client.profile = path.join(ValidFolders.PROFILE, finalFileName)
      try {
        await this.adminRepo.save(client);
  
        fs.renameSync(tmpPath, finalPath);
        // this.presenceService.notifyProfilePictureChange(token.id, UserTypes.CLIENT, client.profile);
        
        return path.join(ValidFolders.PROFILE, finalFileName);
      } catch (err) {
        this.logger.error(`Failed to update admin profile: ${err.message}`);
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        throw new BadRequestException('Profile upload failed. Please try again.');
      }
    }

  async remove(id: string) {
    try {
      this.logger.log(`Removing admin with ID: ${id}`);
      const result = await this.adminRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Admin with ID ${id} not found`);
      }
      this.logger.log(`Admin with ID ${id} removed`);
      return result;
    } catch (error) {
      this.logger.error(`Error removing admin: ${error.message}`);
      throw error;
    }
  }

  getRepository(): Repository<Admin> {
    return this.adminRepo;
  }
}
