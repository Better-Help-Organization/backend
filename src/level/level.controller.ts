import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { LevelService } from './level.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, FindAllQueryParams, ApiFindOneQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';

@Controller('level')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createLevelDto: CreateLevelDto) {
    return this.levelService.create(createLevelDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @UseGuards(AdminJwtAuthGuard)
  findAll(@Query() query: FindAllQueryParams) {
    return this.levelService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @UseGuards(AdminJwtAuthGuard)
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.levelService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateLevelDto: UpdateLevelDto) {
    return this.levelService.update(id, updateLevelDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.levelService.remove(id);
  }
}
