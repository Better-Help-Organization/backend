import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  

  update(id: string, updateQuoteDto: UpdateQuoteDto) {
    return `This action updates a #${id} quote`;
  }

  remove(id: string) {
    return `This action removes a #${id} quote`;
  }
}
