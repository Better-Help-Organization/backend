import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModalName, QuestionType, SubscriptionStatus, TokenPayload } from 'src/common/constants';
import { Answer } from 'src/common/entities/answer.entity';
import { Client } from 'src/common/entities/client.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { LoggerService } from 'src/logger/logger.service';
import { ModalService } from 'src/modal/modal.service';
import { DataSource, In, Repository } from 'typeorm';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(Answer) private readonly answerRepository: Repository<Answer>,
    @InjectRepository(Question) private readonly questionRepository: Repository<Question>,
    @InjectRepository(Option) private readonly optionRepository: Repository<Option>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(Modal) private readonly modalRepo: Repository<Modal>,

    private readonly dataSource: DataSource,
    private readonly modalService: ModalService,
    private readonly logger: LoggerService
  ) {}

  async create(client: TokenPayload, dto: CreateAnswerDto) {
    return await this.dataSource.transaction(async (manager) => {
      const { modalId, answers } = dto;

      const modal = await this.modalService.findOne(modalId);
      if (!modal) throw new NotFoundException(`Modal ${modalId} not found`);

      const savedAnswers: Answer[] = [];

      for (const ans of answers) {
        const { questionId, singleOptionId, multiOptionIds, text } = ans;

        if (!singleOptionId && !text && (!Array.isArray(multiOptionIds) || multiOptionIds.length === 0)) {
          throw new BadRequestException(`Question ${questionId} requires either an option or text.`);
        }

        const question = await manager.getRepository(Question).findOne({
          where: { id: questionId },
          relations: ['option', 'modal'],
        });
        if (!question) throw new NotFoundException(`Question ${questionId} not found`);

        if (!question.modal || question.modal.id !== modalId) {
          throw new BadRequestException(`Question ${questionId} does not belong to modal ${modalId}`);
        }

        switch (question.type) {
          case QuestionType.SINGLE: {
            if (!singleOptionId) throw new BadRequestException(`Question ${questionId} requires a single option.`);

            const singleOption = await manager.getRepository(Option).findOne({
              where: { id: singleOptionId },
            });
            if (!singleOption) throw new NotFoundException(`Option ${singleOptionId} not found`);

            if (singleOption.text === 'Other' && (!text || text.trim() === '')) {
              throw new BadRequestException(`Question ${questionId} requires text when "Other" is selected.`);
            }
            break;
          }
          case QuestionType.MULTIPLE: {
            if (!Array.isArray(multiOptionIds) || multiOptionIds.length === 0) {
              throw new BadRequestException(`Question ${questionId} requires at least one option.`);
            }

            const multiOptions = await manager.getRepository(Option).find({
              where: { id: In(multiOptionIds) },
            });

            if (multiOptions.length !== multiOptionIds.length) {
              const foundIds = multiOptions.map(opt => opt.id);
              const missingIds = multiOptionIds.filter(id => !foundIds.includes(id));
              throw new NotFoundException(`Options not found: ${missingIds.join(', ')}`);
            }

            if (multiOptions.some(opt => opt.text === 'Other') && (!text || text.trim() === '')) {
              throw new BadRequestException(`Question ${questionId} requires text when "Other" is selected.`);
            }
            break;
          }
          case QuestionType.OPEN:
            if (!text || text.trim() === '') {
              throw new BadRequestException(`Question ${questionId} requires a text answer.`);
            }
            break;
          default:
            throw new BadRequestException(`Unsupported question type: ${question.type}`);
        }

        const answer = manager.getRepository(Answer).create({
          client: { id: client.id },
          question: { id: questionId },
          modal: { id: modalId },
          ...(singleOptionId ? { singleOption: { id: singleOptionId } } : {}),
          ...(Array.isArray(multiOptionIds) && multiOptionIds.length > 0
            ? { multiOption: multiOptionIds.map(id => ({ id })) }
            : {}),
          ...(text ? { text } : { text: null }),
        });

        savedAnswers.push(await manager.getRepository(Answer).save(answer));
      }

      return savedAnswers;
    });
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

  async findClientsWhoFilledAllGroupAnswers(queryParams?: FindAllQueryParams) {
  // 1️⃣ Get group therapy modal and questions
  const groupModal = await this.modalRepo.findOne({
    where: { name: ModalName.GROUP_THERAPY },
    relations: ['question'],
  });

  if (!groupModal) {
    return {
      data: [],
      pagination: { totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 10 },
    };
  }

  const totalQuestions = groupModal.question.length;
  if (totalQuestions === 0) {
    return {
      data: [],
      pagination: { totalItems: 0, totalPages: 0, currentPage: 1, pageSize: 10 },
    };
  }

  // 2️⃣ Base query for clients who answered all group questions
  const qb = this.clientRepo.createQueryBuilder('client')
      // join client subscription
    .innerJoin('client.activeSubscription', 'clientSubscription')
    // ensure active subscription
    .andWhere('clientSubscription.status = :activeStatus', {
      activeStatus: SubscriptionStatus.ACTIVE,
    })
    .andWhere(qb => {
      const sub = qb.subQuery()
        .select('answer.clientId')
        .from(Answer, 'answer')
        .where('answer.modalId = :modalId', { modalId: groupModal.id })
        .groupBy('answer.clientId')
        .having('COUNT(DISTINCT answer.questionId) = :totalQuestions', { totalQuestions })
        .getQuery();
      return 'client.id IN ' + sub;
    })
    .andWhere('client.isInGroup = false')
    .setParameter('modalId', groupModal.id);

  // 3️⃣ Field selection
  if (queryParams?.fields) {
    const fields = queryParams.fields
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    if (fields.length) {
      qb.select(fields.map(f => `client.${f}`));
    }
  }

  // 4️⃣ Filters (simple "field=value" or multiple comma-separated)
  if (queryParams?.filters) {
    const filters = queryParams.filters.split(',');
    for (const filter of filters) {
      const [field, operator, value] = filter.split('=');
      if (field && operator && value) {
        if (operator.toLowerCase() === 'like') {
          qb.andWhere(`client.${field} LIKE :${field}`, { [field]: `%${value}%` });
        } else {
          qb.andWhere(`client.${field} ${operator} :${field}`, { [field]: value });
        }
      }
    }
  }

  // 5️⃣ Sorting
  if (queryParams?.sort) {
    const sorts = queryParams.sort.split(',');
    for (const sortRule of sorts) {
      const [field, order] = sortRule.split(':');
      qb.addOrderBy(`client.${field}`, (order?.toUpperCase() as 'ASC' | 'DESC') || 'ASC');
    }
  }

  // 6️⃣ Pagination
  const page = parseInt(queryParams?.page, 10) || 1;
  const take = parseInt(queryParams?.take, 10) || 10;
  const skip = (page - 1) * take;
  qb.skip(skip).take(take);

  // 7️⃣ Execute query
  const [data, totalItems] = await qb.getManyAndCount();
  const totalPages = Math.ceil(totalItems / take);

  // 8️⃣ Return structured result
  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: take,
    },
  };
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
                
            const singleOption = await this.optionRepository.findOne({
              where: { id: ansDto.singleOptionId },
            });
            if (!singleOption) throw new NotFoundException(`Option ${ansDto.singleOptionId} not found`);

            if (singleOption.text === 'Other' && (!ansDto.text || ansDto.text.trim() === '')) {
              throw new BadRequestException(`Question ${ansDto.questionId} requires text when "Other" is selected.`);
            }
            break;
          case QuestionType.MULTIPLE:
            if (!Array.isArray(ansDto.multiOptionIds) || ansDto.multiOptionIds.length === 0) {
              throw new BadRequestException(`Question ${question.id} requires at least one option.`);
            }

            const multiOptions = await this.optionRepository.find({
              where: { id: In(ansDto.multiOptionIds) },
            });

            if (multiOptions.length !== ansDto.multiOptionIds.length) {
              const foundIds = multiOptions.map(opt => opt.id);
              const missingIds = ansDto.multiOptionIds.filter(id => !foundIds.includes(id));
              throw new NotFoundException(`Options not found: ${missingIds.join(', ')}`);
            }

            if (multiOptions.some(opt => opt.text === 'Other') && (!ansDto.text || ansDto.text.trim() === '')) {
              throw new BadRequestException(`Question ${ansDto.questionId} requires text when "Other" is selected.`);
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