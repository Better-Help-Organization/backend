import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parameter } from 'src/common/entities/parameter.entity';
import { ParameterController } from './parameter.controller';
import { ParameterService } from './parameter.service';

@Module({
  imports:[TypeOrmModule.forFeature([Parameter])],
  controllers: [ParameterController],
  providers: [ParameterService],
  exports: [ParameterService],
})
export class ParameterModule {}
