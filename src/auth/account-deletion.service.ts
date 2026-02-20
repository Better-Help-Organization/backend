
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Client } from 'src/common/entities/client.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class AccountDeletionService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,

    @InjectRepository(Therapist)
    private readonly therapistRepo: Repository<Therapist>,

    private readonly dataSource: DataSource,
  ) {}

  async deleteClient(clientId: string): Promise<void> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.anonymizeUser(manager, client);
    });
  }


  async deleteTherapist(therapistId: string): Promise<void> {
    const therapist = await this.therapistRepo.findOne({
      where: { id: therapistId },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.anonymizeUser(manager, therapist);
    });
  }

  private async anonymizeUser(
    manager,
    user: Client | Therapist,
  ): Promise<void> {
    const uuid = randomUUID();

    const fakeEmail = `deleted_${uuid}@deleted.local`;
    const fakePhone = `deleted_${uuid}`;

    await manager.update(
      user.constructor,
      { id: user.id },
      {
        // PII
        firstName: null,
        lastName: null,
        email: fakeEmail,
        phoneNumber: fakePhone,
        profile: null,

        // Auth
        password: null,
        refreshToken: null,
        OTP: null,
        OTPExpires: null,

        firebaseToken: null,
        voIpToken: null,

        isEmailAuthenticated: false,
        isPhoneNumberAuthenticated: false,

        // Status
        status: 'INACTIVE',

        deletedAt: new Date(),
      },
    );
  }
}