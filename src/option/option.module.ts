import { Module } from '@nestjs/common';
import { OptionService } from './option.service';
import { OptionController } from './option.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Option, Question]),
    LoggerModule,
  ], 
  controllers: [OptionController],
  providers: [OptionService],
  exports: [OptionService],
})
export class OptionModule {}
