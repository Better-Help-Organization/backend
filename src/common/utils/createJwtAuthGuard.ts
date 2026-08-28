
import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoles, BaseStatus, UserTypes } from '../constants';

// TODO: add this to the guards
type IArgs = {
  role?: AdminRoles[]
}

export function createJwtAuthGuard(strategy: string) {
    @Injectable()
    class JwtAuthGuardStrategy extends AuthGuard(strategy) {
      public args: any
      
      constructor( args?:IArgs){
        super();
        this.args = args
      }
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const isAuthenticated = await super.canActivate(context);

      if (!isAuthenticated)  return false;

      const user  = context.switchToHttp().getRequest().user;
      
      if (user?.type === UserTypes.ADMIN) {
        if (user.role === AdminRoles.SUPER) return true   
          if (user.status !== BaseStatus.ACTIVE) return false   
            if (this.args?.role && this.args.role.length > 0) {
              if (!this.args.role.includes(user?.role)) {
                // NOTICE: Forbidden messages inside of the guards will be masked by Forbidden resource
                throw new ForbiddenException(
                  `${user?.role} is not allowed to access this resource`
                );
              }
            }
          }
      return true; // Allow access if all checks pass or if no role or status is required  
    }
  }
    return  JwtAuthGuardStrategy
  }