import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const getTypeOrmConfig = (configService: ConfigService): DataSourceOptions => ({
  type: 'mysql',
  host: configService.get<string>('MYSQL_DB_HOST'),
  port: configService.get<number>('MYSQL_DB_PORT'),
  username: configService.get<string>('MYSQL_DB_USER'),
  password: configService.get<string>('MYSQL_DB_PASSWORD'),
  database: configService.get<string>('MYSQL_DB'),
  entities: [__dirname + '../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../**/*-migration{.ts,.js}'],
  synchronize: true,
  subscribers: [__dirname + '/../**/*.subscriber{.ts,.js}'],
  migrationsRun: false,
});