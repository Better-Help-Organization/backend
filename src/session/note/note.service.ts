import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from 'src/common/entities/note.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { Repository } from 'typeorm';
import { CreateNoteDto } from '../dto/note/create-note.dto';
// import { CreateDto } from './dto/create-.dto';
// import { UpdateDto } from './dto/update-.dto';

@Injectable()
export class NoteService {
  
  constructor (
      @InjectRepository(Note) private noteRepo: Repository<Note>,
      private readonly logger: LoggerService,
    ) {}

  async create(id: string, createNoteDto: CreateNoteDto) {
    this.logger.log('Creating a new note');
    try {
      const newNote = this.noteRepo.create({
        ...createNoteDto,
        therapist: { id },
        // session: { id: createNoteDto.session }, 
      });
      console.log('New Note: - note.service.ts:28', newNote);
      const savedNote = await this.noteRepo.save(newNote);
      this.logger.log('Note created successfully');

      return savedNote;
    } catch (error) {
      this.logger.error(`Error creating note: ${error.message}`);
      throw error;
    }
  }
  
  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.noteRepo, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find note: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Note> {
    try {
      const note = await new APIFeatures(this.noteRepo, queryParams).getOne(id);
      if (!note) {
        throw new NotFoundException(`note with ID ${id} not found`);
      }
      return note;
    } catch (error) {
      this.logger.error(`Failed to find note: ${error.message}`);
      throw error;
    }
  }

  // update(id: number, updateDto: UpdateDto) {
  //   return `This action updates a #${id} `;
  // }

  remove(id: number) {
    return `This action removes a #${id} `;
  }
}
