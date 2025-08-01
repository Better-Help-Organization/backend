import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from 'src/chat/chat.module';
import { Therapist } from 'src/common/entities/therapist.entity';
import { UploadInterceptor } from 'src/common/interceptors/upload.interceptor';
import { LoggerModule } from 'src/logger/logger.module';
import { ModalModule } from 'src/modal/modal.module';
import { TherapistController } from './therapist.controller';
import { TherapistService } from './therapist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Therapist]),
    forwardRef(() => ChatModule),
    ModalModule,
    LoggerModule
  ],  
  controllers: [TherapistController],
  providers: [TherapistService, UploadInterceptor],
  exports: [TherapistService],
})
export class TherapistModule {}
