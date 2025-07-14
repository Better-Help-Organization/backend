import { Injectable } from '@nestjs/common';
import { CreateTherapistDto } from './dto/create-therapist.dto';
import { UpdateTherapistDto } from './dto/update-therapist.dto';

@Injectable()
export class TherapistService {
  create(createTherapistDto: CreateTherapistDto) {
    return 'This action adds a new therapist';
  }

  findAll() {
    return `This action returns all therapist`;
  }

  findOne(id: number) {
    return `This action returns a #${id} therapist`;
  }

  update(id: number, updateTherapistDto: UpdateTherapistDto) {
    return `This action updates a #${id} therapist`;
  }

  remove(id: number) {
    return `This action removes a #${id} therapist`;
  }
}
