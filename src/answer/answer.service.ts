import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from 'src/common/entities/answer.entity';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { LoggerService } from 'src/logger/logger.service';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { TokenPayload } from 'src/common/constants';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';
import { Client } from 'src/common/entities/client.entity';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(Answer) private readonly answerRepository: Repository<Answer>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Question) private readonly questionRepository: Repository<Question>,
    @InjectRepository(Option) private readonly optionRepository: Repository<Option>,
    private readonly logger: LoggerService
  ) {}
  async create(client: TokenPayload, dto: CreateAnswerDto) {
    try {
      if (dto.clientId !== client.id) {
        throw new UnauthorizedException('You cannot submit answers for other clients.');
      }

      if (dto.clientId) {
        const client = await this.clientRepository.findOne({ where: { id: dto.clientId } });
        if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);
      }

      if (dto.questionId) {
        const question = await this.questionRepository.findOne({ where: { id: dto.questionId } });
        if (!question) throw new NotFoundException(`Question ${dto.questionId} not found`);
      }

      if (dto.optionId) {
        const option = await this.optionRepository.findOne({ where: { id: dto.optionId } });
        if (!option) throw new NotFoundException(`Option ${dto.optionId} not found`);
      }

        const existing = await this.answerRepository.findOne({
        where: {
          client: { id: dto.clientId },
          question: { id: dto.questionId },
        },
      });

      if (existing) {
        throw new BadRequestException('You have already submitted an answer for this question.');
      }

      const answer = this.answerRepository.create({
        client: { id: dto.clientId },
        question: {id: dto.questionId},
        option: {id: dto.optionId},
      });

      return await this.answerRepository.save(answer);
    } catch (err) {
      this.logger.error(`Failed to create answer: ${err.message}`);
      throw err;
    }
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

      if (dto.clientId) {
        if (dto.clientId !== client.id) {
          throw new UnauthorizedException('You cannot update this answer.');
        }
        const clientData = await this.clientRepository.findOne({ where: { id: dto.clientId } });
        if (!clientData) throw new NotFoundException(`Client ${dto.clientId} not found`);
      }

      if (dto.questionId) {
        const question = await this.questionRepository.findOne({ where: { id: dto.questionId } });
        if (!question) throw new NotFoundException(`Question ${dto.questionId} not found`);
      }

      if (dto.optionId) {
        const option = await this.optionRepository.findOne({ where: { id: dto.optionId } });
        if (!option) throw new NotFoundException(`Option ${dto.optionId} not found`);
      }

      if (dto.questionId && dto.questionId !== answer.question.id) {
        const duplicate = await this.answerRepository.findOne({
          where: {
            client: { id: dto.clientId },
            question: { id: dto.questionId },
          },
        });

        if (duplicate) {
          throw new BadRequestException('You have already submitted an answer for that question.');
        }
      }

      Object.assign(answer, {client: { id: dto.clientId }, question: {id: dto.questionId}, option: {id: dto.optionId},});
      return await this.answerRepository.save(answer);
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