import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    ExecutionContext,
    Next,
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

      // const status =
      //   exception instanceof HttpException
      //     ? exception.getStatus()
      //     : HttpStatus.INTERNAL_SERVER_ERROR;
  
      // const message =
      //   exception instanceof HttpException
      //     ? exception.getResponse()
      //     : 'Internal server error';
  
      // response.status(status).json({
      //   error: true,
      //   statusCode: status,
      //   timestamp: new Date().toISOString(),
      //   path: request.url,
      //   method: request.method,
      //   message,
      // });
    }
  }