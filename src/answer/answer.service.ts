import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Answer } from 'src/common/entities/answer.entity';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { QuestionType, TokenPayload } from 'src/common/constants';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(Answer) private readonly answerRepository: Repository<Answer>,
    @InjectRepository(Question) private readonly questionRepository: Repository<Question>,
    @InjectRepository(Option) private readonly optionRepository: Repository<Option>,

    private readonly logger: LoggerService
  ) {}
  async create(client: TokenPayload, dto: CreateAnswerDto) {
    const { answers } = dto;

    const savedAnswers: Answer[] = [];

    for (const ans of answers) {
      const { questionId, singleOptionId, multiOptionIds, text } = ans;

      if (!singleOptionId && !text &&   (!Array.isArray(multiOptionIds) || multiOptionIds.length === 0)) {
        throw new BadRequestException(`Question ${questionId} requires either an option or text.`);
      }

      const question = await this.questionRepository.findOne({ where: { id: questionId }, relations: ['option'] });
      if (!question) throw new NotFoundException(`Question ${questionId} not found`);

      switch (question.type) {
        case QuestionType.SINGLE:
          if (!singleOptionId) throw new BadRequestException(`Question ${questionId} requires a single option.`);
          break;
        case QuestionType.MULTIPLE:
          if (!Array.isArray(multiOptionIds) || multiOptionIds.length === 0) {
            throw new BadRequestException(`Question ${questionId} requires multiple options.`);
          }
          break;
        case QuestionType.OPEN:
          if (!text || text.trim() === '') throw new BadRequestException(`Question ${questionId} requires a text answer.`);
          break;
        default:
          throw new BadRequestException(`Unsupported question type: ${question.type}`);
      }

      if(singleOptionId){
        const option = await this.optionRepository.findOne({ where: { id: singleOptionId }, relations: ['question'] });
        if (!option) throw new NotFoundException(`Option ${singleOptionId} not found`);
      }

      if(Array.isArray(multiOptionIds) &&multiOptionIds.length > 0){
        const options = await this.optionRepository.find({
          where: { id: In(multiOptionIds) },
          relations: ['question'],
        });

        if (options.length !== multiOptionIds.length) {
          const foundIds = options.map(opt => opt.id);
          const missingIds = multiOptionIds.filter(id => !foundIds.includes(id));
          throw new NotFoundException(`Options not found: ${missingIds.join(', ')}`);
        }
      }

      const answer = this.answerRepository.create({
        client: { id: client.id },
        question: { id: questionId },
        ...(singleOptionId ? { singleOption: { id: singleOptionId } } : {}),
        ...(Array.isArray(multiOptionIds) && multiOptionIds.length > 0
          ? { multiOption: multiOptionIds.map(id => ({ id })) }
          : {}),
        ...(text ? { text } : { text: null }),
      });

      savedAnswers.push(await this.answerRepository.save(answer));
    }

    return savedAnswers;
  }

  async findAll(queryParams?: FindAllQueryParams) {
    try {
      return await new APIFeatures(this.answerRepository, queryParams).getMany();
    } catch (error) {
      this.logger.error(`Failed to find answers: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams): Promise<Answer> {
    try {
      const answer = await new APIFeatures(this.answerRepository, queryParams).getOne(id);
      if (!answer) {
        throw new NotFoundException(`answer with ID ${id} not found`);
      }
      return answer;
    } catch (error) {
      this.logger.error(`Failed to find answer: ${error.message}`);
      throw error;
    }
  }

  async update(client: TokenPayload, id: string, dto: UpdateAnswerDto) {
    try {
      const answer = await this.findOne(id);

      const updatedAnswers: Answer[] = [];

      for (const ansDto of dto.answers) {
        const question = await this.questionRepository.findOne({ where: { id: ansDto.questionId } });
        if (!question) throw new NotFoundException(`Question ${ansDto.questionId} not found`);
        answer.question = question;

        switch (question.type) {
          case QuestionType.SINGLE:
            if (!ansDto.singleOptionId) {
              throw new BadRequestException(`Question ${question.id} requires a single option.`);
            }
            break;
          case QuestionType.MULTIPLE:
            if (!Array.isArray(ansDto.multiOptionIds) || ansDto.multiOptionIds.length === 0) {
              throw new BadRequestException(`Question ${question.id} requires multiple options.`);
            }
            break;
          case QuestionType.OPEN:
            if (!ansDto.text || ansDto.text.trim() === '') {
              throw new BadRequestException(`Question ${question.id} requires a text answer.`);
            }
            break;
          default:
            throw new BadRequestException(`Unsupported question type: ${question.type}`);
        }

        if (ansDto.singleOptionId) {
          const option = await this.optionRepository.findOne({ where: { id: ansDto.singleOptionId } });
          if (!option) throw new NotFoundException(`Option ${ansDto.singleOptionId} not found`);
          answer.singleOption = option;
        } else {
          answer.singleOption = null;
        }

        if (Array.isArray(ansDto.multiOptionIds) &&ansDto.multiOptionIds.length > 0) {
          const options = await this.optionRepository.find({
            where: { id: In(ansDto.multiOptionIds) },
            relations: ['question'],
          });

          if (options.length !== ansDto.multiOptionIds.length) {
            const foundIds = options.map(opt => opt.id);
            const missingIds = ansDto.multiOptionIds.filter(id => !foundIds.includes(id));
            throw new NotFoundException(`Options not found: ${missingIds.join(', ')}`);
          }
        } else {
          answer.singleOption = null;
        }

        answer.text = ansDto.text || null;
        updatedAnswers.push(await this.answerRepository.save(answer));
      }

      return updatedAnswers;
    } catch (err) {
      this.logger.error(`Failed to update answer: ${err.message}`);
      throw err;
    }
  }

  async remove(id: string) {
    try {
      const answer = await this.findOne(id);
      await this.answerRepository.remove(answer);
    } catch (err) {
      this.logger.error(`Delete answer error: ${err.message}`);
      throw err;
    }
  }
}