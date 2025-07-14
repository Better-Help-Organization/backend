import {
    CanActivate,
    ExecutionContext,
    Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { DYNAMIC_GUARD_KEY } from '../decorators/dynamic-guard.decorator';
  
  @Injectable()
  export class DynamicGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // Retrieve the guards from metadata
      const guards = this.reflector.get(DYNAMIC_GUARD_KEY,context.getHandler());
  
      if (!guards || guards.length === 0) return true
      for (const guard of guards) {
        try{ 
            const result = await guard.canActivate(context); if (result) return true;
        }
        catch(error){}
      }

      return false;
    }
  }