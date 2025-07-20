import { Module } from '@nestjs/common';
import { NoteService } from './.service';
import { NotesController } from './.controller';

@Module({
  controllers: [NotesController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NotesModule {}
