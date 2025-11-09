import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modal } from 'src/common/entities/modal.entity';
import { LoggerModule } from 'src/logger/logger.module';
import { ModalController } from './modal.controller';
import { ModalService } from './modal.service';

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
