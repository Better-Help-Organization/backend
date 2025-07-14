import { Module } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { TherapistController } from './therapist.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Therapist } from 'src/common/entities/therapist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Therapist])
  ],  
  controllers: [TherapistController],
  providers: [TherapistService],
  exports: [TherapistService],
})
export class TherapistModule {}
