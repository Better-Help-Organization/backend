import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyQuote } from 'src/common/entities/daily-quote.entity';
import { Quote } from 'src/common/entities/quote.entity';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quote,
      DailyQuote
    ])
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
