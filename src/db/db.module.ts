import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Level } from 'src/common/entities/level.entity';
import { Modal } from 'src/common/entities/modal.entity';
import { Parameter } from 'src/common/entities/parameter.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { DbService } from './db.service';
import { SeedService } from './seed.service';
import { getTypeOrmConfig } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
    }),
    TypeOrmModule.forFeature([ Parameter, Subscription, Level, Modal ]),
  ],
  providers:[DbService, SeedService],
  exports:[SeedService]
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly dbService: DbService) {}
  
  async onModuleInit() {
    return
    await this.dbService.seedSubscriptions();
    await this.dbService.seedAdmin();
    await this.dbService.seedOnboarding();
    await this.dbService.seedParameters();
  }
}
