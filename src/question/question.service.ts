import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from 'src/common/entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { Modal } from 'src/common/entities/modal.entity';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question) private readonly questionRepository: Repository<Question>,
    @InjectRepository(Modal) private readonly modalRepository: Repository<Modal>,
    private readonly logger: LoggerService
  ) {}
  async create(dto: CreateQuestionDto) {
    try {
      const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
      if (!modal) {
        throw new BadRequestException(`Modal with ID ${dto.modalId} does not exist.`);
      }

      return await this.questionRepository.save(this.questionRepository.create({
        ...dto,
        modal: { id: dto.modalId },
      }));
    } catch (err) {
      this.logger.error(`Create question error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.questionRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find questions: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Question> {
    try {
      const question = await new APIFeatures(this.questionRepository, queryParams).getOne(id);
      if (!question) {
        throw new NotFoundException(`Question with ID ${id} not found`);
      }
      return question;
    } catch (error) {
      this.logger.error(`Failed to find question: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateQuestionDto) {
    try {
      const question = await this.findOne(id);

      if (dto.modalId) {
        const modal = await this.modalRepository.findOne({ where: { id: dto.modalId } });
        if (!modal) {
          throw new BadRequestException(`Modal with ID ${dto.modalId} does not exist.`);
        }
      }

      Object.assign(question, { ...dto, modal: dto.modalId });
      return await this.questionRepository.save(question);
    } catch (err) {
      this.logger.error(`Update question error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const question = await this.findOne(id);
      await this.questionRepository.remove(question);
    } catch (err) {
      this.logger.error(`Delete question error: ${err.message}`);
      throw err;
    }
  }
}