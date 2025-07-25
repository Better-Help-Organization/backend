import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionService } from './option.service';

@Controller('option')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createOptionDto: CreateOptionDto) {
    return this.optionService.create(createOptionDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.optionService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
    @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.optionService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateOptionDto: UpdateOptionDto) {
    return this.optionService.update(id, updateOptionDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.optionService.remove(id);
  }
}
