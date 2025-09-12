import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteService } from './quote.service';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  findAll() {
    return this.quoteService.findAll();
  }

  @Get(':id')
    @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quoteService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.quoteService.remove(id);
  }
}
