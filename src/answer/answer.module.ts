import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from 'src/common/entities/answer.entity';
import { Client } from 'src/common/entities/client.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';
import { LoggerModule } from 'src/logger/logger.module';
import { ModalModule } from 'src/modal/modal.module';
import { AnswerController } from './answer.controller';
import { AnswerService } from './answer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Answer, Client, Question, Option, Modal]),
    ModalModule,
    LoggerModule,
  ],  
  controllers: [AnswerController],
  providers: [AnswerService],
  exports: [AnswerService]
})
export class AnswerModule {}
