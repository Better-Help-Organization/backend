import { Injectable, NotFoundException } from '@nestjs/common';
// import { CreateClientDto } from './dto/create-client.dto';
// import { UpdateClientDto } from './dto/update-client.dto';
import { Repository } from 'typeorm';
import { Client } from 'src/common/entities/client.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class ClientService {
  
  @InjectRepository(Client) private clientRepo: Repository<Client>
  private readonly logger: LoggerService

  create(createClientDto) {
    return 'This action adds a new client';
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Client>): Promise<Client> {
    try {
      this.logger.log(`Finding user with ID: ${id}`);
      const user = await new APIFeatures(this.clientRepo, queryParams).getOne(id);

      if (!user) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException('User not found');
      }
      this.logger.log(`User found with ID: ${id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error finding user with ID: ${id} - ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Client>) {
    try {
      this.logger.log(`Finding all users with query params: ${JSON.stringify(queryParams)}`);
      const users = await new APIFeatures(this.clientRepo, queryParams).getMany();
      this.logger.log(`Found users`);
      return users;
    } catch (error) {
      this.logger.error(`Error finding all users: ${error.message}`);
      throw error;
    }
  }


  // update(id: number, updateClientDto: UpdateClientDto) {
  //   return `This action updates a #${id} client`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} client`;
  // }

  getRepository(): Repository<Client> {
    return this.clientRepo;
  }
}
