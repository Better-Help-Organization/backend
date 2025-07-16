import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  @Injectable()
  export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest();
  
      return next.handle().pipe(
        map((data) => {
          const baseResponse = {
            message: 'success',
            statusCode: context.switchToHttp().getResponse().statusCode,
            method: request.method,
            path: request.url,
            timestamp: new Date().toISOString(),
          };
          const transformedData = Array.isArray(data?.data)
          ? {
              ...data,
              ...baseResponse
            }
          : {
              data,
              ...baseResponse
            };
        return transformedData;
        }),
      );
    }
  }