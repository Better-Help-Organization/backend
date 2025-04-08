import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();
const configService = new ConfigService();
const AppDataSource = new DataSource({
    type: 'mysql',
    host: configService.get<string>('MYSQL_DB_HOST'),
    port: configService.get<number>('MYSQL_DB_PORT'),
    username: configService.get<string>('MYSQL_DB_USER'),
    password: configService.get<string>('MYSQL_DB_PASSWORD'),
    database: configService.get<string>('MYSQL_DB'),
    logging: true,
    synchronize: false,
    migrationsRun: false,
    entities: ['**/*.entity.ts'],
    migrations: ['src/database/migrations/*-migration.ts'],
});

export default AppDataSource;