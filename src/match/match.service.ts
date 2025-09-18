import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { SessionNotif, TokenPayload, Tokens } from 'src/common/constants';
import { Answer } from 'src/common/entities/answer.entity';
import { Client } from 'src/common/entities/client.entity';
import { MatchTherapist } from 'src/common/entities/match-therapist.entity';
import { Match } from 'src/common/entities/match.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { APIFeatures } from 'src/common/middlewares/api-features';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoggerService } from 'src/logger/logger.service';
import { TherapistService } from 'src/therapist/therapist.service';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AcceptMatchDto } from './dto/accept-match.dto';
import { CreateMatchDto } from './dto/create-match.dto';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match) 
    private readonly matchRepository: Repository<Match>,

    @InjectRepository(MatchTherapist) 
    private readonly matchTherapistRepository: Repository<MatchTherapist>,

    @InjectRepository(Preference) 
    private readonly preferenceRepository: Repository<Preference>,

    @InjectRepository(Answer) 
    private readonly answerRepository: Repository<Answer>,

    private readonly clientService: ClientService,
    private readonly therapistService: TherapistService,
    private readonly firebaseService: FirebaseService,
    private readonly logger: LoggerService,
  ) {}

  async create(token: TokenPayload, createMatchDto: CreateMatchDto): Promise<{ message: string }> {
    const existingMatch = await this.matchRepository.findOne({
      where: {
        client: { id: token.id },
        accepted: IsNull(),
        expiresAt: MoreThan(new Date())
      },
      relations: ['client', 'accepted'],
    });

    // if (existingMatch) {
    //   throw new ConflictException(
    //     'You already have a pending match request. Please wait patiently while you are being matched — this may take up to 3 days.'
    //   );
    // }

    const preference = await this.preferenceRepository.findOne({
      where: { id: createMatchDto.preferenceId },
      relations: {
        client: true,
        modal: true,
        level: true,
        availability: true,
      },
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    if (preference.client.id !== token.id) {
      throw new ForbiddenException('You are not authorized to access this preference');
    }

    const answer = await this.answerRepository.find({
      where: { 
        modal: { id: preference.modal.id },
        client: { id: token.id }
      },
      relations: {
        question: true,
        modal: true
      },
    });
    if (!answer) {
      throw new NotFoundException('Answer not found for this modal and client');
    }
    
    let answerIds :string[] = [];

    answerIds = answer
      .map(t => t.id)
      .filter(id => id);

    // const therapists = await this.therapistService.findMatchingTherapists({
    //   gender: preference.gender,
    //   level: preference.level?.id,
    //   availability: preference.availability.map(a => ({
    //     day: a.day,
    //     day_period: a.day_period,
    //   })),
    // });
    const {data:therapists} = await this.therapistService.findAll({take:'0'});

    if (therapists?.length === 0) {
      throw new NotFoundException('No therapists match your preferences');
    }

    const match = this.matchRepository.create({
      client: { id: token.id },
      accepted: null,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // set to 3 days
    });
    await this.matchRepository.save(match);

    const matchTherapists = therapists.map(therapist => {
      return this.matchTherapistRepository.create({
        match,
        therapist: { id: therapist.id },
      });
    });

    await this.matchTherapistRepository.save(matchTherapists);

    const tokens: Tokens = {
      client: [],
      therapist: [],
      admin: [],
    };
    
    tokens.therapist = therapists
      .map(t => t.firebaseToken)
      .filter(token => token);

    // if (tokens?.length > 0) {
      const client: Pick<Client, 'firstName' | 'lastName' | 'gender' | 'dob'> = await this.clientService.findOne(token.id);

      await this.firebaseService.sendPushNotification(
        tokens,
        JSON.stringify({
          answerData: answerIds,
          matchData: match,
          clientData: client,
          availability: preference.availability,
        }),
        SessionNotif.MATCH_REQUEST,
        'New match request! Tap to accept.'
      );
    // }

    this.logger.log(`Sent match request to ${tokens.therapist.length} therapists`);

    return { message: 'Match request created successfully' };
  }
  
  async acceptMatch(token: TokenPayload, acceptMatchDto: AcceptMatchDto): Promise<{ message: string }> {
    const queryRunner = this.matchRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log({acceptMatchDto})
      const match = await this.matchRepository.findOne({
        where: { id: acceptMatchDto.matchId },
        relations: ['client', 'matchedTherapist', 'matchedTherapist.therapist', 'accepted'],
      });
      console.log({match})
      if (!match) {
        throw new NotFoundException('Match not found');
      }

      if (match.accepted) {
        throw new ConflictException('Match already accepted by another therapist');
      }

      if (match.expiresAt && match.expiresAt < new Date()) {
        throw new BadRequestException('This match request has expired');
      }

      const therapist = await this.therapistService.findOne(token.id);

      if (!therapist) {
        throw new NotFoundException('Therapist not found');
      }

      const matchTherapist = match.matchedTherapist.find(mt => mt.therapist.id === therapist.id);
      if (!matchTherapist) {
        throw new BadRequestException('Therapist not part of this match');
      }

      matchTherapist.respondedAt = new Date();
      await queryRunner.manager.save(matchTherapist);

      match.accepted = therapist;
      await queryRunner.manager.save(match);

      const otherTherapists = match.matchedTherapist.filter(
        mt => mt.therapist.id !== therapist.id,
      );  
      const otherTokens: Tokens = {
        client: [],
        therapist: [],
        admin: [],
      };
      
      otherTokens.therapist = otherTherapists
        .map(mt => mt.therapist.firebaseToken)
        .filter((token): token is string => Boolean(token)); // type-safe non-null filter

      console.log("other tokens: - match.service.ts:209", otherTokens)
      console.log("other tokens: - match.service.ts:210", otherTokens)

        await this.firebaseService.sendPushNotification(
          otherTokens,
          JSON.stringify({ match: match }),
          SessionNotif.MATCH_TAKEN,
          'A match request you received has been fulfilled by another therapist.'
        );

        this.logger.log(`Sent notification letting others know`);


      if (match.client?.firebaseToken) {
        await this.firebaseService.sendPushNotification(
          {client:[match.client.firebaseToken]},
          JSON.stringify({
            AcceptedTherapist: match.accepted,
            therapist
          }),
          SessionNotif.MATCH_ACCEPTED,
          'Your match request has been accepted!'
        );
      }

      await queryRunner.commitTransaction();

      return { message: 'Match accepted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string, queryParams?: FindOneQueryParams<Match>) {
    try {
      this.logger.log(`Finding match with ID: ${id}`);
      const match = await new APIFeatures(this.matchRepository, queryParams).getOne(id);

      if (!match) {
        this.logger.warn(`Match not found with ID: ${id}`);
        throw new NotFoundException('Match not found');
      }

      this.logger.log(`Match found with ID: ${id}`);
      return match;
    } catch (error) {
      this.logger.error(`Error finding match: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryParams?: FindAllQueryParams<Match>) {
    try {
      this.logger.log(`Fetching all matchs`);
      const result = await new APIFeatures(this.matchRepository, queryParams).getMany();
      this.logger.log(`Found ${result.data.length} matchs`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching matchs: ${error.message}`);
      throw error;
    }
  }

  // update(token: TokenPayload, id: string, updateMatchDto: UpdateMatchDto) {
  //   return `This action updates a #${id} match`;
  // }

  async remove(token: TokenPayload, id: string): Promise<void> {
    try {
      const match = await this.matchRepository.findOne({
        where: { id },
        relations: ['client'],
      });

      if (!match) throw new NotFoundException(`Match with ID ${id} not found`);
      // if (match.client.id !== token.id) {
      //   throw new ForbiddenException('You are not authorized to delete this match');
      // }

      await this.matchRepository.remove(match);
    } catch (err) {
      this.logger.error(`Delete match error: ${err.message}`);
      throw err;
    }
  }
}
