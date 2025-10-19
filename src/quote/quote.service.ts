import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyQuote } from 'src/common/entities/daily-quote.entity';
import { Quote } from 'src/common/entities/quote.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuoteService {


    constructor(
      @InjectRepository(Quote)
      private  quoteRepo:Repository<Quote>,
      @InjectRepository(DailyQuote)
      private  dailyQuoteRepo:Repository<DailyQuote>,
      private readonly logger: LoggerService,  
    ){}
  
   async create(createQuoteDto: CreateQuoteDto) {
      try {
        const modal = this.quoteRepo.create({
        ...createQuoteDto,
        });
        return await this.quoteRepo.save(modal);
      } catch (err) {
        this.logger.error(`Create Quote error: ${err.message}`);
        throw err;
      }
    }
  
    async findAll(queryParams?: FindAllQueryParams) {
      try {
        return await new APIFeatures(this.quoteRepo, queryParams).getMany();
      } catch (error) {
        this.logger.error(`Error finding all Quotes: ${error.message}`);
        return error;
      }
    }
  
    async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Quote> {
    try {
      console.log({id, queryParams})
        const quote = await new APIFeatures(this.quoteRepo, queryParams).getOne(id);
        if (!quote) throw new NotFoundException('Quote not found');
        return quote
      } catch (error) {
        this.logger.error(`Error finding Quote: ${error.message}`);
        throw error;
      }
    }

    async getDailyQuote(): Promise<Quote | null> {
      const todayStr = new Date().toISOString().split('T')[0];

      // Check if already exists
      let daily = await this.dailyQuoteRepo.findOne({
        where: { date: todayStr },
        relations: ['quote'],
      });

      if (daily) return daily.quote;

      // Pick a random quote and save
      const allQuotes = await this.quoteRepo.find();
      if (!allQuotes.length) return null;

      const randomIndex = Math.floor(Math.random() * allQuotes.length);
      daily = this.dailyQuoteRepo.create({
        date: todayStr,
        quote: allQuotes[randomIndex],
      });

      await this.dailyQuoteRepo.save(daily);
      return daily.quote;
    }

  

  update(id: string, updateQuoteDto: UpdateQuoteDto) {
    return `This action updates a #${id} quote`;
  }

  async remove(id: string) {
    try {
      this.logger.log(`Removing quote with ID: ${id}`);
      const result = await this.quoteRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`quote with ID ${id} not found`);
      }
      this.logger.log(`quote with ID ${id} removed`);
      return result;
    } catch (error) {
      this.logger.error(`Error removing quote: ${error.message}`);
      throw error;
    }
  }

}
