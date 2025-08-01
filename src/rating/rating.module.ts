import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Rating } from 'src/common/entities/rating.entity';
import { Therapist } from 'src/common/entities/therapist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, Therapist]),
    LoggerModule,
  ], 
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
