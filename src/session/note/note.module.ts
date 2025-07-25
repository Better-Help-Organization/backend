import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from 'src/common/entities/note.entity';
import { NotesController } from './note.controller';
import { NoteService } from './note.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note]),
  ],
  controllers: [NotesController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NotesModule {}
