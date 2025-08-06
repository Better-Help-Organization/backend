import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { BaseStatus, LangCode, LevelType, ModalName, QuestionType } from 'src/common/constants';
import { onboardingData } from 'src/common/default-data/onboarding.default';
import { Admin } from 'src/common/entities/admin.entity';
import { Language } from 'src/common/entities/language.entity';
import { Level } from 'src/common/entities/level.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Option } from 'src/common/entities/option.entity';
import { Question } from 'src/common/entities/question.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('DbService module initialized');
  }

  async seedAdmin(){
    const adminRepository = this.dataSource.getRepository(Admin);
    this.logger.log('Seeding admin...');
    const email = this.configService.getOrThrow<string>("ADMIN_EMAIL");
    const exists = await adminRepository.findOne({ where: { email } });
    const password = this.configService.getOrThrow<string>("ADMIN_PASSWORD");
    const hashedPassword = await hash(password, 10);
    const admin = {
    name: "Admin",
    email,
    isEmailAuthenticated: true,
    password: hashedPassword,
    status: BaseStatus.ACTIVE,
    };

    if (!exists) {
    await adminRepository.save(admin);
    this.logger.log(`Admin ${admin.name} saved`);
    } else {
    this.logger.log(`Admin ${admin.name}   already exists`);
    }
  }  

  async seedOnboarding() {
    const modalRepository = this.dataSource.getRepository(Modal);
    const questionRepository = this.dataSource.getRepository(Question);
    const optionRepository = this.dataSource.getRepository(Option);
    const languageRepository = this.dataSource.getRepository(Language);
    const levelRepository = this.dataSource.getRepository(Level);

    // Seed Languages
    const languages = [
        { code: LangCode.EN, name: 'English' },
        { code: LangCode.AM, name: 'Amharic' },
        { code: LangCode.OR, name: 'Oromo' },
        { code: LangCode.TI, name: 'Tigrigna' },
    ];

    for (const lang of languages) {
        const exists = await languageRepository.findOne({ where: { code: lang.code } });
        if (!exists) {
        await languageRepository.save(languageRepository.create(lang));
        this.logger.log(`Created Language: ${lang.name}`);
        } else {
        this.logger.log(`Language "${lang.name}" already exists`);
        }
    }

    // Seed Levels
    const levels = [
        {
        type: LevelType.ASSOCIATE,
        minXP: 0,
        maxXP: 4,
        price: 580,
        },
        {
        type: LevelType.MODERATE,
        minXP: 5,
        maxXP: 9,
        price: 700,
        },
        {
        type: LevelType.ADVANCED,
        minXP: 10,
        price: 800,
        },
    ];

    for (const level of levels) {
        const exists = await levelRepository.findOne({ where: { type: level.type } });

        if (!exists) {
        await levelRepository.save(levelRepository.create(level));
        this.logger.log(`Created Level: ${level.type}`);
        } else {
        this.logger.log(`Level "${level.type}" already exists`);
        }
    }

    // Seed Modals, Questions, and Options
    for (const modalData of onboardingData) {
        const { name, description, questions } = modalData;

        const MODAL_NAME_MAP: Record<string, ModalName> = {
        'Individual Therapy': ModalName.INDIVIDUAL_THERAPY,
        'Teen Therapy': ModalName.TEEN_THERAPY,
        'Couple Therapy': ModalName.COUPLE_THERAPY,
        'Group Therapy': ModalName.GROUP_THERAPY,
        };

        const modalEnumValue = MODAL_NAME_MAP[name];
        if (!modalEnumValue) {
        this.logger.warn(`Skipped unknown modal name: ${name}`);
        continue;
        }

        let modal = await modalRepository.findOne({ where: { name: modalEnumValue } });

        if (!modal) {
        modal = await modalRepository.save({ name: modalEnumValue, description });
        this.logger.log(`Created Modal: ${modalEnumValue}`);
        } else {
        this.logger.log(`Modal "${modalEnumValue}" already exists`);
        }

        // 🗑 Remove questions in DB that are not in the current data
        const currentQuestionTexts = questions.map(q => q.text);
        const existingQuestions = await questionRepository.find({
        where: { modal: { id: modal.id } },
        relations: ['option', 'modal'],
        });

        for (const existingQuestion of existingQuestions) {
            if (!currentQuestionTexts.includes(existingQuestion.text)) {
            await optionRepository.delete({ question: { id: existingQuestion.id } });
            await questionRepository.delete(existingQuestion.id);
            this.logger.log(`Deleted outdated question: ${existingQuestion.text}`);
            }
        }

        for (const questionData of questions) {
            const { text, type, option } = questionData;
            const typeMap: Record<string, QuestionType> = {
                single: QuestionType.SINGLE,
                multiple: QuestionType.MULTIPLE,
                open: QuestionType.OPEN,
            };

            const questionType = typeMap[type];
            if (!questionType) {
            throw new BadRequestException("Type is not correct");
            }

            let question = await questionRepository.findOne({
                where: { text, modal: { id: modal.id } },
                relations: ['modal'],
            });

            if (!question) {
                question = questionRepository.create({
                    text,
                    type: questionType,
                    modal,
                });

                await questionRepository.save(question);
                this.logger.log(` Created Question: ${text}`);
            } else {
                this.logger.log(` Question "${text}" already exists`);
            }

            if (option && option.length > 0) {
                for (const optionText of option) {
                    const exists = await optionRepository.findOne({
                        where: { text: optionText, question: { id: question.id } },
                        relations: ['question'],
                    });

                    if (!exists) {
                        const option = optionRepository.create({
                            text: optionText,
                            question,
                        });

                        await optionRepository.save(option);
                        this.logger.log(` Created Option: ${optionText}`);
                    } else {
                        this.logger.log(` Option "${optionText}" already exists`);
                    }
                }
            }
        }
    }
  }
}
