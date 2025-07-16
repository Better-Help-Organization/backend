import { ArgumentsHost, Catch, ExceptionFilter, ExecutionContext, HttpException, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { LoggerService } from "src/logger/logger.service";


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
        let errorDetails: Record<string, any>;

        if (typeof exception.getResponse() === 'string') {
            // Handle string error messages
            errorDetails = { message: exception.getResponse() };
          } else {
            // Handle object error messages
            errorDetails = exception.getResponse() as Record<string, any>;
          }
          
        // const errorDetails = exception.getResponse();
        errorDetails['timestamp'] = new Date().toISOString(),
        errorDetails['path'] = request.url,

        this.logger.captureRequestContext(host as ExecutionContext, HttpExceptionFilter.name)
        this.logger.error(
            `Exception thrown for ${request.method} ${request.url} ${status} ${errorDetails.message}`
            ,exception
        );

        response.status(status).send(errorDetails)
    }
}