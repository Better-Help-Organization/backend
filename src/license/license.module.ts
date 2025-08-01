import { Module } from '@nestjs/common';
import { LicenseService } from './license.service';
import { LicenseController } from './license.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { License } from 'src/common/entities/license.entity';
import { Modal } from 'src/common/entities/modal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([License, Modal]),
    LoggerModule,
  ], 
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
