import { ArgumentsHost, Catch, ExceptionFilter, ExecutionContext, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { LoggerService } from "src/logger/logger.service";


interface StandardErrorResponse {
  message: string | string[];
  timestamp: string;
  path: string;
  statusCode: number;
}


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    
  constructor(
    private readonly logger: LoggerService
    ){}
    catch(exception:HttpException, host: ArgumentsHost){
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        let errorDetails: StandardErrorResponse = {
            message: '',
            timestamp: new Date().toISOString(),
            path: request.url,
            statusCode: status,
          };

        const exceptionResponse = exception.getResponse();

        if (typeof exceptionResponse === 'string') {
          errorDetails.message = exceptionResponse;
        } else if (typeof exceptionResponse === 'object') {
          errorDetails = { ...errorDetails, ...exceptionResponse };
        }

        this.logger.captureRequestContext(host as ExecutionContext, HttpExceptionFilter.name)
        this.logger.error(
            `Exception thrown for ${request.method} ${request.url} ${status} ${errorDetails.message}`
            ,exception
        );

        response.status(status).send(errorDetails)
    }
}