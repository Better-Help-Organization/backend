import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NoteService } from './.service';
// import { CreateDto } from './dto/create-.dto';
// import { UpdateDto } from './dto/update-.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly noteService: NoteService) {}

  // @Post()
  // create(@Body() createDto: CreateDto) {
  //   return this.noteService.create(createDto);
  // }

  @Get()
  findAll() {
    return this.noteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.noteService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
  //   return this.noteService.update(+id, updateDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.noteService.remove(+id);
  }
}
