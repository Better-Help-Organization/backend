import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mood } from 'src/common/entities/mood.entity';
import { MoodController } from './mood.controller';
import { MoodService } from './mood.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mood])
  ],
  controllers: [MoodController],
  providers: [MoodService],
})
export class MoodModule {}
