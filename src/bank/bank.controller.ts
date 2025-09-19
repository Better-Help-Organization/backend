import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { BankService } from './bank.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createBankDto: CreateBankDto) {
    return this.bankService.create(createBankDto);
  }

  @Get()
  @ApiFindAllQueryParams()
  @DynamicGuards(
  new AdminJwtAuthGuard(),
  new ClientJwtAuthGuard(),
  new TherapistJwtAuthGuard()
  )
  findAll(
    @Query() queryParams?: FindAllQueryParams
      ){
    return this.bankService.findAll(queryParams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
  new AdminJwtAuthGuard(),
  new ClientJwtAuthGuard(),
  new TherapistJwtAuthGuard()
  )
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.bankService.findOne(id, queryParams);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateBankDto: UpdateBankDto) {
    return this.bankService.update(id, updateBankDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.bankService.remove(id);
  }
}
