import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Question } from 'src/common/entities/question.entity';
import { Modal } from 'src/common/entities/modal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Modal]),
    LoggerModule,
  ], 
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
