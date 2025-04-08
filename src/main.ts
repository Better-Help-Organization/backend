(global as any).crypto = require('crypto');


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

import { SwaggerDocs } from './docs/SwaggerDocs';



async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix(`/api/v1`);

  // Pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform:true
  }))
  
  // middleware
  // app.use(cookieParser())
  

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
