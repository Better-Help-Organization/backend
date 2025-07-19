import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';

@Injectable()
export class AdminService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) {}

  async create(data: Partial<Admin>): Promise<Admin> {
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

  async findOne(id: string, queryParams?: FindOneQueryParams<Admin>): Promise<Admin> {
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

  async findAll(queryParams?: FindAllQueryParams<Admin>): Promise<Admin[]> {
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

  async update(id: string, updateDto: UpdateAdminDto): Promise<Admin> {
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
