import { Module } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { PreferenceController } from './preference.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Preference } from 'src/common/entities/preference.entity';
import { Client } from 'src/common/entities/client.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Language } from 'src/common/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Preference, Client, Modal, Language]),
    LoggerModule,
  ], 
  controllers: [PreferenceController],
  providers: [PreferenceService],
  exports: [PreferenceService],
})
export class PreferenceModule {}
