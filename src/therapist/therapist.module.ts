import { Module } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { TherapistController } from './therapist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Therapist } from 'src/common/entities/therapist.entity';
import { ModalModule } from 'src/modal/modal.module';
import { LoggerModule } from 'src/logger/logger.module';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Therapist]),
    ModalModule,
    LoggerModule
  ],  
  controllers: [TherapistController],
  providers: [TherapistService, UploadInterceptor],
  exports: [TherapistService],
})
export class TherapistModule {}
