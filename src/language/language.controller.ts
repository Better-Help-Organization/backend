import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LanguageService } from './language.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
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
  findAll() {
    return this.languageService.findAll();
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.languageService.findOne(id);
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
