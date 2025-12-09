import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from 'src/common/entities/session.entity';
import { TherapistPaymentPeriod } from 'src/common/entities/therapist-payment-period.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { In, Repository } from 'typeorm';
import { CreateTherapistPaymentPeriodDto } from './dto/create-therapist-payment-period.dto';
import { UpdateTherapistPaymentPeriodDto } from './dto/update-therapist-payment-period.dto';

@Injectable()
export class TherapistPaymentPeriodService {
    constructor(
    @InjectRepository(TherapistPaymentPeriod)
    private readonly periodRepo: Repository<TherapistPaymentPeriod>,
    private readonly logger: LoggerService,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  private async attachSessions(
    period: TherapistPaymentPeriod,
    sessionIds: string[]
  ) {
    if (!sessionIds || sessionIds.length === 0) {
      throw new BadRequestException('You must provide at least one session.');
    }

    const sessions = await this.sessionRepo.find({
      where: { id: In(sessionIds) },
      relations: ['therapist'], // ensure we can access therapist
    });

    if (sessions.length !== sessionIds.length) {
      const foundIds = sessions.map(s => s.id);
      const missingIds = sessionIds.filter(id => !foundIds.includes(id));
      
      throw new NotFoundException({
        message:`The following session's were not found`,
        items : [...missingIds]
      });
    }

    // Check all sessions belong to the same therapist
    const invalidTherapist = sessions.find(
      s => s.therapist.id !== period.therapist.id
    );
    if (invalidTherapist) {
      throw new ConflictException({
      message:`Session does not belong to therapist ${invalidTherapist.therapist.firstName}`,
      items: [invalidTherapist]
    });
    }

    // Check all sessions are within period dates
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    const outOfRange = sessions.filter(
      s => s.schedule < start || s.schedule > end
    );
    if (outOfRange.length > 0) {
      const ids = outOfRange.map(s => s.id);
    throw new ConflictException({
      message:`Sessions outside period range`,
      items: [...outOfRange]
    });
    }

    period.session = sessions;
    return period;
  }

  async create(dto: CreateTherapistPaymentPeriodDto) {
    // const therapist = await this.therapistService.findOne(dto.therapist);
    // dto.therapist = therapist;
    const period = this.periodRepo.create({
      ...dto,
    therapist: {id: dto.therapist},
    });
    await this.attachSessions(period, dto.sessionIds);
    return this.periodRepo.save(period);
  }


  async findOne(id: string, queryParams?: FindOneQueryParams<TherapistPaymentPeriod>) {
    try {
      this.logger.log(`Finding record with ID: ${id}`);
      const record = await new APIFeatures(this.periodRepo, queryParams).getOne(id);

      if (!record) {
        this.logger.warn(`record not found with ID: ${id}`);
        throw new NotFoundException('Record not found');
      }

      this.logger.log(`Record found with ID: ${id}`);
      return record;
    } catch (error) {
      this.logger.error(`Error finding record: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<TherapistPaymentPeriod>) {
    try {
      this.logger.log(`Fetching all record`);
      const record = await new APIFeatures(this.periodRepo, queryParams).getMany();
      this.logger.log(`Found ${record.data.length} record`);
      return record;
    } catch (error) {
      this.logger.error(`Error fetching record: ${error.message}`);
      throw error;
    }
  }

  update(id: string, updateTherapistPaymentPeriodDto: UpdateTherapistPaymentPeriodDto) {
    return `This action updates a #${id} therapistPaymentPeriod`;
  }

  async remove(id: string) {
    const period = await this.findOne(id);
    return this.periodRepo.remove(period);
  }
}
