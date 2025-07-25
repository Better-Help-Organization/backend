import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { LanguageService } from './language.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';

@Controller('language')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languageService.create(createLanguageDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @UseGuards(AdminJwtAuthGuard)
  findAll(@Query() query: FindAllQueryParams) {
    return this.languageService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @UseGuards(AdminJwtAuthGuard)
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.languageService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateLanguageDto: UpdateLanguageDto) {
    return this.languageService.update(id, updateLanguageDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.languageService.remove(id);
  }
}
