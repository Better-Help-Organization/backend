import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StatusService } from './.service';
// import { CreateDto } from './dto/create-.dto';
// import { UpdateDto } from './dto/update-.dto';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  // @Post()
  // create(@Body() createDto: CreateDto) {
  //   return this.statusService.create(createDto);
  // }

  @Get()
  findAll() {
    return this.statusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statusService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
  //   return this.statusService.update(+id, updateDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statusService.remove(+id);
  }
}
