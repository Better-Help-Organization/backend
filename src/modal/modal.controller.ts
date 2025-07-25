import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ModalService } from './modal.service';
import { CreateModalDto } from './dto/create-modal.dto';
import { UpdateModalDto } from './dto/update-modal.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AdminJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';

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
  @UseGuards(AdminJwtAuthGuard)
  findAll(@Query() query: FindAllQueryParams) {
    return this.modalService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @UseGuards(AdminJwtAuthGuard)
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
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
