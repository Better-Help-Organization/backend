import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable } from 'rxjs';

export function NonGetGuard(BaseGuard: Type<CanActivate>): Type<CanActivate> {
  @Injectable()
  class MixinNonGetGuard implements CanActivate {
    constructor(private readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      if (request.method === 'GET') {
        return true;
      }

      const guard = this.moduleRef.get(BaseGuard, { strict: false });
      const result = await guard.canActivate(context);

      if (result instanceof Observable) {
        return await result.toPromise(); // Convert Observable to Promise
      }

      return result;
    }
  }

  return mixin(MixinNonGetGuard);
}
