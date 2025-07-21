import { Module } from '@nestjs/common';
import { ModalService } from './modal.service';
import { ModalController } from './modal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Modal } from 'src/common/entities/modal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Modal]),
    LoggerModule,
  ], 
  controllers: [ModalController],
  providers: [ModalService],
  exports: [ModalService],
})
export class ModalModule {}
