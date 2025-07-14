import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class AdminService {

  private readonly logger: LoggerService
  @InjectRepository(Admin) private adminRepo: Repository<Admin>
  
  create(createAdminDto: CreateAdminDto) {
    return 'This action adds a new admin';
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
  update(id: number, updateAdminDto: UpdateAdminDto) {
    return `This action updates a #${id} admin`;
  }

  remove(id: number) {
    return `This action removes a #${id} admin`;
  }

    getRepository(): Repository<Admin> {
      return this.adminRepo;
    }
}
