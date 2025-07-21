import { Module } from '@nestjs/common';
import { LanguageService } from './language.service';
import { LanguageController } from './language.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'src/logger/logger.module';
import { Language } from 'src/common/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Language]),
    LoggerModule,
  ], 
  controllers: [LanguageController],
  providers: [LanguageService],
  exports: [LanguageService],  
})
export class LanguageModule {}
