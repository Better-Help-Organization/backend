import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateModalDto } from './dto/create-modal.dto';
import { UpdateModalDto } from './dto/update-modal.dto';
import { ModalService } from './modal.service';

@Controller('modal')
export class ModalController {
  constructor(private readonly modalService: ModalService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createModalDto: CreateModalDto) {
    return this.modalService.create(createModalDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.modalService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.modalService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateModalDto: UpdateModalDto) {
    return this.modalService.update(id, updateModalDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.modalService.remove(id);
  }
}
