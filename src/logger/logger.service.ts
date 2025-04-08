import { Injectable,  ExecutionContext, ArgumentsHost } from '@nestjs/common';
import { logger } from './logger.config';
import { TokenPayload } from 'src/common/constants';

@Injectable()
export class LoggerService {
  
  private context: string | null;
  private user: TokenPayload | null;
  private ip: string | null

  constructor() {}

  setContext(context: string) {
    this.context = context;
  }

  setUser(user: TokenPayload) {
    this.user = user
  }

  setIp (ip: string){
    this.ip = ip
  }

  log(message: string) {
    logger.info(message, { context: this.context, user:this.user, ip:this.ip });
  }

  error(messageOrError?: string | Error, error?: Error) {
    let message: string | undefined;
    let trace: string | null = null;
  
    if (messageOrError instanceof Error) {
      message = messageOrError.message;
      trace = this.getStackTrace(messageOrError);
    } else if (typeof messageOrError === 'string') {
      message = messageOrError;
      trace = this.getStackTrace(error);
    }

    logger.error(message, { context: this.context, user:this.user, ip:this.ip , trace });
  }

  warn(message: string) {
    logger.warn(message, { context: this.context, ip:this.ip , user:this.user });
  }

  debug(message: string) {
    logger.debug(message, { context: this.context, ip:this.ip , user:this.user });
  }

  // Custom function to capture stack traces with wider context
  private getStackTrace(error:Error): string {
    const stack = error?.stack;
    if (stack)  return stack
    return 'UnknownTrace';
  }

  public captureRequestContext(context: ExecutionContext, fallback?:string): void {
    
    const request = context.switchToHttp().getRequest();
    const ip = request.headers['x-forwarded-for'] || request.ip;
    const user = request.user || null;

    let finalContext = null
    if (context.getClass()?.name && context.getHandler()?.name)
      finalContext = `${context.getClass()?.name} - ${context.getHandler()?.name}`;
    else if (fallback)
      finalContext =  fallback
    else 
      finalContext = null;
    
    this.setContext(finalContext)

    if (user) this.setUser(user); 
    if (ip) this.setIp(ip);
  }

}