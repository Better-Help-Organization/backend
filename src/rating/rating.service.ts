import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from 'src/common/entities/rating.entity';
import { Therapist } from 'src/common/entities/therapist.entity';
import { LoggerService } from 'src/logger/logger.service';
import { TokenPayload } from 'src/common/constants';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,

    @InjectRepository(Therapist)
    private readonly therapistRepository: Repository<Therapist>,

    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, dto: CreateRatingDto): Promise<Rating> {
    try {
      const therapist = await this.therapistRepository.findOne({ where: { id: dto.therapistId } });
      if (!therapist) throw new NotFoundException(`Therapist with ID ${dto.therapistId} not found`);

      const rating = this.ratingRepository.create({
        value: dto.value,
        comment: dto.comment,
        client: { id: token.id },
        therapist: { id: dto.therapistId },
      });

      return await this.ratingRepository.save(rating);
    } catch (err) {
      this.logger.error(`Create rating error: ${err.message}`);
      throw err;
    }
  }

  async findAll(): Promise<Rating[]> {
    try {
      return await this.ratingRepository.find({ relations: ['client', 'therapist'] });
    } catch (error) {
      this.logger.error(`Failed to find ratings: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<Rating> {
    try {
      const rating = await this.ratingRepository.findOne({
        where: { id },
        relations: ['client', 'therapist'],
      });

      if (!rating) throw new NotFoundException(`Rating with ID ${id} not found`);
      return rating;
    } catch (error) {
      this.logger.error(`Failed to find rating: ${error.message}`);
      throw error;
    }
  }

  async update(token: TokenPayload, id: string, dto: UpdateRatingDto): Promise<Rating> {
    try {
      const rating = await this.ratingRepository.findOne({
        where: { id },
        relations: ['client'],
      });

      if (!rating) throw new NotFoundException(`Rating with ID ${id} not found`);
      if (rating.client.id !== token.id)
        throw new ForbiddenException('You are not allowed to update this rating');

      if (dto.therapistId) {
        const therapist = await this.therapistRepository.findOne({ where: { id: dto.therapistId } });
        if (!therapist) throw new NotFoundException(`Therapist with ID ${dto.therapistId} not found`);
        rating.therapist = therapist;
      }

      rating.value = dto.value ?? rating.value;
      rating.comment = dto.comment ?? rating.comment;

      return await this.ratingRepository.save(rating);
    } catch (err) {
      this.logger.error(`Update rating error: ${err.message}`);
      throw err;
    }
  }

  async remove(token: TokenPayload, id: string): Promise<void> {
    try {
      const rating = await this.ratingRepository.findOne({
        where: { id },
        relations: ['client'],
      });

      if (!rating) throw new NotFoundException(`Rating with ID ${id} not found`);
      if (rating.client.id !== token.id)
        throw new ForbiddenException('You are not allowed to delete this rating');

      await this.ratingRepository.remove(rating);
    } catch (err) {
      this.logger.error(`Delete rating error: ${err.message}`);
      throw err;
    }
  }
}
