import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Final_Files_Dir, PaymentStatus, SubscriptionStatus, Tmp_Files_Dir, TokenPayload, UserTypes, ValidFolders } from 'src/common/constants';
import { Payment } from 'src/common/entities/payment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,

    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, dto: CreatePaymentDto): Promise<Payment> {
    const tmpFileName = dto.filename;
    const ext = path.extname(tmpFileName ?? '');

    if (!tmpFileName) {
      throw new BadRequestException('No uploaded file associated with this request');
    }

    // Ensure the file belongs to this client
    if (!tmpFileName.startsWith(`${token.id}_`)) {
      throw new BadRequestException('Uploaded file does not belong to the current client');
    }

    const tmpPath = path.join(Tmp_Files_Dir, tmpFileName);
    if (!fs.existsSync(tmpPath)) {
      throw new BadRequestException('Uploaded file does not exist or was already processed');
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: {
        id: dto.subscriptionId,
        client: { id: token.id },
      },
      relations: ['client'],
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID ${dto.subscriptionId} not found for this client`,
      );
    }
    let savedPayment: Payment | null = null;
    try {
      const payment = this.paymentRepo.create({
        amount: dto.amount,
        date: dto.date ?? new Date(),
        method: dto.method,
        receipt: dto.receipt,
        subscription,
      });

      savedPayment = await this.paymentRepo.save(payment);

      // construct final file name and path
      const finalFileName = `${subscription.client.id}_${subscription.id}_${savedPayment.id}${ext}`;
      const finalPath = path.join(Final_Files_Dir, ValidFolders.PAYMENT, finalFileName);

      fs.mkdirSync(path.dirname(finalPath), { recursive: true });
      fs.renameSync(tmpPath, finalPath);

      savedPayment.filename = finalFileName;
    subscription.status = SubscriptionStatus.PENDING;
    await this.subscriptionRepo.save(subscription);
      return await this.paymentRepo.save(savedPayment);
    } catch (err) {
      this.logger.error(`Create payment error: ${err.message}`);

      // cleanup tmp file if db save failed
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }

      // cleanup partially saved payment
      if (savedPayment && savedPayment.id) {
        await this.paymentRepo.delete(savedPayment.id).catch(() => null);
      }

      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.paymentRepo, queryParams).getMany();
    } catch (err) {
      this.logger.error(`Failed to find payments: ${err.message}`);
      throw err;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Payment> {
    try {
      const payment = await new APIFeatures(this.paymentRepo, queryParams).getOne(id);
      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }
      return payment;
    } catch (err) {
      this.logger.error(`Failed to find payment: ${err.message}`);
      throw err;
    }
  }

  async update(token: TokenPayload, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { id },
        relations: ['subscription', 'subscription.client'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // If a new file is uploaded, replace the old one
      if (dto.filename) {
        const tmpPath = path.join(Tmp_Files_Dir, dto.filename);
        if (!fs.existsSync(tmpPath)) {
          throw new BadRequestException('Uploaded replacement file not found');
        }

        // Ensure the file belongs to this client
        if (!dto.filename.startsWith(`${payment.subscription.client.id}_`)) {
          throw new BadRequestException('Uploaded replacement file does not belong to this client');
        }

        const ext = path.extname(dto.filename) || '.bin';
        const newFileName = `${payment.subscription.client.id}_${payment.subscription.id}_${payment.id}${ext}`;
        const finalPath = path.join(Final_Files_Dir, ValidFolders.PAYMENT, newFileName);

        // delete old receipt if it exists
        if (payment.filename) {
          const oldPath = path.join(Final_Files_Dir, ValidFolders.PAYMENT, payment.filename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        fs.mkdirSync(path.dirname(finalPath), { recursive: true });
        fs.renameSync(tmpPath, finalPath);

        payment.filename = newFileName;
      }

      // Update scalar fields
      if (dto.amount !== undefined) {
        if (dto.amount < 0) {
          throw new BadRequestException('Payment amount cannot be negative');
        }
        payment.amount = dto.amount;
      }

      if (dto.date) {
        payment.date = new Date(dto.date);
      }

      if (dto.method) {
        payment.method = dto.method;
      }

      if (dto.receipt) {
        payment.receipt = dto.receipt;
      }

      if (dto.status) {
        payment.status = dto.status;
      }

      return await this.paymentRepo.save(payment);
    } catch (err) {
      this.logger.error(`Update payment error: ${err.message}`);
      throw err;
    }
  }

  async softRemove(id: string): Promise<void> {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { id },
        relations: ['subscription', 'subscription.client'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // Soft delete via TypeORM
      await this.paymentRepo.softDelete(id);
    } catch (err) {
      this.logger.error(`Soft delete payment error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string, token?: TokenPayload): Promise<void> {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { id },
        relations: ['subscription', 'subscription.client'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      // Client-specific validation
      if (token && token.type === UserTypes.CLIENT) {
        if (payment.subscription.client.id !== token.id) {
          throw new BadRequestException('You are not authorized to delete this payment');
        }

        if (payment.status !== PaymentStatus.PENDING) {
          throw new BadRequestException(
            'Clients can only delete payments with status PENDING',
          );
        }
      }

      // Delete associated file from disk
      if (payment.filename) {
        const filePath = path.join(Final_Files_Dir, ValidFolders.PAYMENT, payment.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await this.paymentRepo.remove(payment);
      
      this.logger.log(`Payment ${id} removed successfully`);
    } catch (err) {
      this.logger.error(`Delete payment error: ${err.message}`);
      throw err;
    }
  }
}
