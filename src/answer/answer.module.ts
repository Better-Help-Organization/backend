import { Module } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { AnswerController } from './answer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Answer } from 'src/common/entities/answer.entity';
import { Question } from 'src/common/entities/question.entity';
import { Option } from 'src/common/entities/option.entity';
import { Client } from 'src/common/entities/client.entity';
import { ModalModule } from 'src/modal/modal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Answer, Client, Question, Option]),
    ModalModule,
    LoggerModule,
  ],  
  controllers: [AnswerController],
  providers: [AnswerService],
  exports: [AnswerService]
})
export class AnswerModule {}
