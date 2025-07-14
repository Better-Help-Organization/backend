import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function createOptionalJwtAuthGuard(strategy: string) {
  @Injectable()
  class OptionalJwtAuthGuardStrategy extends AuthGuard(strategy) {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const isAuthenticated = await super.canActivate(context);
      if (!isAuthenticated)  return false;
      return true; 
    }

    handleRequest(err: any, user: any) {
      if (err || !user) {
        return undefined;
      }
      return user;
    }
  }

  return OptionalJwtAuthGuardStrategy;
}