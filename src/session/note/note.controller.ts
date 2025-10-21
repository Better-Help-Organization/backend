import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateNoteDto } from '../dto/note/create-note.dto';
import { NoteService } from './note.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @DynamicGuards(
   new  TherapistJwtAuthGuard()
  )
  create(
    @CurrentUser() user: TokenPayload,
    @Body() createNoteDto: CreateNoteDto) {
    return this.noteService.create(user.id, createNoteDto);
  }

  @Get()
  @ApiFindAllQueryParams()
  @DynamicGuards(
   new  TherapistJwtAuthGuard(),
   new  AdminJwtAuthGuard()
  )
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.noteService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
   new  TherapistJwtAuthGuard(),
   new  AdminJwtAuthGuard()
  )
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.noteService.findOne(id, queryParams);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
  //   return this.noteService.update(+id, updateDto);
  // }

  @Delete(':id')
  @DynamicGuards(
   new  TherapistJwtAuthGuard(),
   new  AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.noteService.remove(+id);
  }
}
