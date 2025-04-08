(global as any).crypto = require('crypto');


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

import { SwaggerDocs } from './docs/SwaggerDocs';
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as glob from 'glob';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix(`/api/v1`);

  // Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform:true
  }))


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
  

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
