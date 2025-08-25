(global as any).crypto = require('crypto');


import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerDocs } from './docs/SwaggerDocs';

import * as glob from 'glob';
import * as path from 'path';

import cookieParser from 'cookie-parser';
import { static as expose } from 'express';

import { DynamicGuard } from './common/guard/dynamic.guard';
import { LoggerService } from './logger/logger.service';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { BadRequestExceptionFilter } from './common/exception-filters/bad-request.exceptipon';
import { HttpExceptionFilter } from './common/exception-filters/http.exception-filter';
import { TypeOrmExceptionFilter } from './common/exception-filters/typeorm-exception.filter';

import 'reflect-metadata';
import { VERSION } from './common/constants';

import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix(`/api`);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION.ONE
  });


  app.use(cookieParser())

  // Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform:true
  }))

  const reflector = app.get(Reflector); // Reflector is needed for guards that use metadata
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));


  // Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Use global guards  
  app.useGlobalGuards(new DynamicGuard(reflector));

  const logger = new LoggerService()
  // Filters
  app.useGlobalFilters(new BadRequestExceptionFilter(logger));
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalFilters(new TypeOrmExceptionFilter(logger));

  if (process.env.NODE_ENV !== "prod") {

    // Auto-generated swagger docs
    const controllers = glob.sync(path.join(__dirname, '/**/*.controller{.ts,.js}'));
    SwaggerDocs.findAndDecorateControllers(controllers);
  
    // Dynamically load entities matching the glob pattern
    const entityFiles = glob.sync(path.join(__dirname, '/**/*.entity{.ts,.js}'));
    // Import and filter valid entities (constructors)
    const extraModels: Function[] = entityFiles
      .map((file) => {
        const entityModule = require(file);
        return Object.values(entityModule).filter((exported) => typeof exported === 'function');
      })
      .flat();
  
      const serverUrl = `/${process.env.NODE_ENV}`
      const customJs = serverUrl + '/public/custom.js'
      const customCssUrl = serverUrl + '/public/custom.css'

      const options = new DocumentBuilder()
        .setTitle('Nestjs API')
        .setDescription('The nestjs API description')
        .setVersion('1.0')
        .addServer(serverUrl)
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, options, {
        extraModels,
      });
  
      SwaggerModule.setup('docs', app, document, {
        customJs,
        customCssUrl
      });
  }
  
  // serve images as static assets
  app.use(
    '/static', 
    // cors(),
    expose('uploads')
  )

  app.use(
    '/public', 
    // cors(),
    expose('public')
  )


  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
