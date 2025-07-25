import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PreferenceService } from './preference.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';

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
  @DynamicGuards(
    new ClientJwtAuthGuard()
    ,new AdminJwtAuthGuard()
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.preferenceService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @DynamicGuards(
    new ClientJwtAuthGuard()
    ,new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.preferenceService.findOne(id, query);
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
