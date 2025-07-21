import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Option } from 'src/common/entities/option.entity';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { Question } from 'src/common/entities/question.entity';

@Injectable()
export class OptionService {
  constructor(
    @InjectRepository(Option) private readonly optionRepository: Repository<Option>,
    @InjectRepository(Question) private readonly questionRepository: Repository<Question>,
    private readonly logger: LoggerService
  ) {}
  async create(dto: CreateOptionDto) {
    try {
      const question = await this.questionRepository.findOne({
        where: { id: dto.questionId },
      });

      if (!question) {
        throw new BadRequestException(`Question with ID ${dto.questionId} not found`);
      }

      const existing = await this.optionRepository.findOne({
        where: {
          text: dto.text,
          question: { id: dto.questionId },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'An option with the same text already exists for this question.',
        );
      }

      const option = this.optionRepository.create({
        ...dto,
        question,
      });

      return await this.optionRepository.save(option);
    } catch (err) {
      this.logger.error(`Create option error: ${err.message}`);
      throw err;
    }
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.optionRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find options: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Option> {
    try {
      const option = await new APIFeatures(this.optionRepository, queryParams).getOne(id);
      if (!option) {
        throw new NotFoundException(`Option with ID ${id} not found`);
      }
      return option;
    } catch (error) {
      this.logger.error(`Failed to find option: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateOptionDto) {
    try {
      const option = await this.findOne(id);

      if (dto.questionId) {
        const question = await this.questionRepository.findOne({ where: { id: dto.questionId } });
        if (!question) {
          throw new BadRequestException(`Question with ID ${dto.questionId} does not exist.`);
        }
      }

      if (dto.text && dto.text !== option.text) {
        const existing = await this.optionRepository.findOne({
          where: {
            text: dto.text,
            question: { id: dto.questionId },
          },
        });

        if (existing && existing.id !== id) {
          if (!dto.questionId) {
            throw new BadRequestException(
              'An option with the same text already exists. Provide a question ID to limit the scope of the update to a specific question.',
            );
          } else {
            throw new BadRequestException(
              'Another option with the same text already exists for the specified question.',
            );
          }
        }
      }

      Object.assign(option, { ...dto, question: dto.questionId });
      return await this.optionRepository.save(option);
    } catch (err) {
      this.logger.error(`Update option error: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const option = await this.findOne(id);
      await this.optionRepository.remove(option);
    } catch (err) {
      this.logger.error(`Delete option error: ${err.message}`);
      throw err;
    }
  }
}