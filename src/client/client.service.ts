import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'src/common/entities/client.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { TokenPayload, Tmp_Files_Dir, Final_Files_Dir, ValidFolders } from 'src/common/constants';

@Injectable()
export class ClientService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async create(data: Partial<Client>) {
    try {
      this.logger.log(`Creating client with data: ${JSON.stringify(data)}`);
      const client = this.clientRepo.create({
        ...data,
      });
      const saved = await this.clientRepo.save(client);
      this.logger.log(`Client created with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating client: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Client>) {
    try {
      this.logger.log(`Finding client with ID: ${id}`);
      const client = await new APIFeatures(this.clientRepo, queryParams).getOne(id);

      if (!client) {
        this.logger.warn(`Client not found with ID: ${id}`);
        throw new NotFoundException('Client not found');
      }

      this.logger.log(`Client found with ID: ${id}`);
      return client;
    } catch (error) {
      this.logger.error(`Error finding client: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Client>) {
    try {
      console.log({queryParams})
      this.logger.log(`Fetching all clients`);
      const result = await new APIFeatures(this.clientRepo, queryParams).getMany();
      this.logger.log(`Found ${result.data.length} clients`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching clients: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateClientDto) {
    const client = await this.findOne(id);
    Object.assign(client, updateDto);
    try {
      const updated = await this.clientRepo.save(client);
      this.logger.log(`Updated client with ID: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating client: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    try {
      await this.clientRepo.remove(client);
      this.logger.log(`Removed client with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Error removing client: ${error.message}`);
      throw error;
    }
  }

  getRepository(): Repository<Client> {
    return this.clientRepo;
  }

  async setOnline(id: string) {
    await this.clientRepo.update(id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });
  }

  async setOffline(id: string) {
    await this.clientRepo.update(id, {
      isOnline: false,
      lastSeenAt: new Date(),
    });
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
      await this.clientRepo.save(client);

      fs.renameSync(tmpPath, finalPath);

      return path.join(ValidFolders.PROFILE, finalFileName);
    } catch (err) {
      this.logger.error(`Failed to update therapist profile: ${err.message}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      throw new BadRequestException('Profile upload failed. Please try again.');
    }
  }
}
