import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateParameterDto } from './dto/create-parameter.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ParameterService } from './parameter.service';

// @UseGuards(AdminJwtAuthGuard)
@Controller('params')
export class ParameterController {
  constructor(private readonly parameterService: ParameterService) {}


  @ApiFindAllQueryParams([
    ,new AdminJwtAuthGuard()
  ])
  @Get()
  findAll(
    @Query() queryParams,
  ) {
    return this.parameterService.findAll(queryParams);
  }

  @ApiFindOneQueryParams([
  ,new AdminJwtAuthGuard()
  ])
  @Get(':id')
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.parameterService.findOne(id, queryParams);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post()
  create(@Body() createParameterDto: CreateParameterDto) {
    return this.parameterService.create(createParameterDto);
  }


  @UseGuards(AdminJwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user,
    @Param('id') id: string, 
    @Body() updateParameterDto: UpdateParameterDto) {
    return this.parameterService.update(id, updateParameterDto, user);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parameterService.remove(id);
  }
}

