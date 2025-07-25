import { Module } from '@nestjs/common';
import { LevelService } from './level.service';
import { LevelController } from './level.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Level } from 'src/common/entities/level.entity';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Level]),
    LoggerModule,
  ], 
  controllers: [LevelController],
  providers: [LevelService],
  exports: [LevelService],  
})
export class LevelModule {}
