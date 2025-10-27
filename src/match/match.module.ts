import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { Answer } from 'src/common/entities/answer.entity';
import { MatchTherapist } from 'src/common/entities/match-therapist.entity';
import { Match } from 'src/common/entities/match.entity';
import { Preference } from 'src/common/entities/preference.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ParameterModule } from 'src/parameter/parameter.module';
import { TherapistModule } from 'src/therapist/therapist.module';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, MatchTherapist, Preference, Answer ]),
    forwardRef(() => ClientModule),
    TherapistModule,
    LoggerModule,
    FirebaseModule,
    ParameterModule
  ], 
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
