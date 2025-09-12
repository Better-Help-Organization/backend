import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diary } from 'src/common/entities/diary.entity';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([Diary])
  ],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
