import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';

@Controller('preference')
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() client: TokenPayload, @Body() createPreferenceDto: CreatePreferenceDto) {
    return this.preferenceService.create(client, createPreferenceDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  findAll() {
    return this.preferenceService.findAll();
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.preferenceService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ClientJwtAuthGuard)
  update(@CurrentUser() client: TokenPayload, @Param('id') id: string, @Body() updatePreferenceDto: UpdatePreferenceDto) {
    return this.preferenceService.update(client, id, updatePreferenceDto);
  }

  @Delete(':id')
  @UseGuards(ClientJwtAuthGuard)
  remove(@CurrentUser() client: TokenPayload, @Param('id') id: string) {
    return this.preferenceService.remove(id);
  }
}
