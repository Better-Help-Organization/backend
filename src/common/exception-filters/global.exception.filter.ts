import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ExecutionContext
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';
  
  @Catch()
  export class GlobalExceptionFilter implements ExceptionFilter {
    
    constructor(private readonly logger: LoggerService){}

    catch(exception: any, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
      
      this.logger.captureRequestContext(host as ExecutionContext, GlobalExceptionFilter.name)
      this.logger.error(
        `Exception thrown for ${request.method} ${request.url}`
        ,exception
      );

      return;
    }
  }