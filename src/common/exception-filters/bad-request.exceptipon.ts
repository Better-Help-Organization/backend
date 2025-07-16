import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    BadRequestException,
    ExecutionContext,
  } from '@nestjs/common';
  import { Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';
  
  @Catch(BadRequestException)
  export class BadRequestExceptionFilter implements ExceptionFilter {

    constructor(private readonly logger: LoggerService){}
    
    catch(exception: BadRequestException, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
      const status = exception.getStatus();
  
      const exceptionResponse = exception.getResponse();
      let message = exceptionResponse;
  
      // Extract the validation message from class-validator
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse['message'] &&
        Array.isArray(exceptionResponse['message'])
      ) {
        message = exceptionResponse['message'].join(', '); // Join the messages into a single string
      }

      this.logger.captureRequestContext(host as ExecutionContext, BadRequestExceptionFilter.name)
      this.logger.error(
        `Exception thrown for ${request.method} ${request.url} ${status}`,
        exception,
      );

      // Return a simplified error response
      response.status(status).send(message);
    }
  }
  