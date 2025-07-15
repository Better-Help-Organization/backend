import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { UpdateTherapistDto } from './dto/update-therapist.dto';

@Controller('therapist')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get()
  findAll() {
    return this.therapistService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.therapistService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTherapistDto: UpdateTherapistDto) {
    return this.therapistService.update(id, updateTherapistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.therapistService.remove(id);
  }
}
