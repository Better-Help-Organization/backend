import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Final_Files_Dir, SessionNotif, Tmp_Files_Dir, TokenPayload, UserTypes, ValidFolders } from 'src/common/constants';
import { StatusDto } from 'src/common/dto/status.dto';
import { Client } from 'src/common/entities/client.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { PresenceService } from 'src/presence/presence.service';
import { Repository } from 'typeorm';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    private readonly logger: LoggerService,
    private readonly firebaseService: FirebaseService,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly presenceService: PresenceService
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
      this.presenceService.notifyProfilePictureChange(token.id, UserTypes.CLIENT, client.profile);
      
      return path.join(ValidFolders.PROFILE, finalFileName);
    } catch (err) {
      this.logger.error(`Failed to update client profile: ${err.message}`);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      throw new BadRequestException('Profile upload failed. Please try again.');
    }
  }

  async toggleStatus(id: string, status: StatusDto) {
    this.logger.log(`Toggling status for client with ID ${id}`);
    try {
      await this.clientRepo.update(id, status);
      const {firebaseToken} = await this.findOne(id)
      const message = `${status.status}`
      const body = `Your account is now ${status.status}`
      await this.firebaseService.sendPushNotification({client:[firebaseToken]}, message.toString(),SessionNotif.STATUS_CHANGED, body);

      this.logger.log(`Status for client with ID ${id} updated successfully`);
      return 'successfully updated';
    } catch (error) {
      this.logger.error(`Error toggling status for client with ID ${id}: ${error.message}`);
      throw error;
    }
  }
}
