import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { LoggerModule } from 'src/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from 'src/common/entities/match.entity';
import { MatchTherapist } from 'src/common/entities/match-therapist.entity';
import { TherapistModule } from 'src/therapist/therapist.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { Preference } from 'src/common/entities/preference.entity';
import { Answer } from 'src/common/entities/answer.entity';
import { ClientModule } from 'src/client/client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchTherapist, Preference, Answer ]),
    ClientModule,
    TherapistModule,
    LoggerModule,
    FirebaseModule
  ], 
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
