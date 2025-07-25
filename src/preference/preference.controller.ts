import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferenceService } from './preference.service';

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
  @UseGuards(AdminJwtAuthGuard)
  findAll(@Query() query: FindAllQueryParams) {
    return this.preferenceService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @UseGuards(AdminJwtAuthGuard)
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.preferenceService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@CurrentUser() client: TokenPayload, @Param('id') id: string, @Body() updatePreferenceDto: UpdatePreferenceDto) {
    return this.preferenceService.update(client, id, updatePreferenceDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@CurrentUser() client: TokenPayload, @Param('id') id: string) {
    return this.preferenceService.remove(id);
  }
}
