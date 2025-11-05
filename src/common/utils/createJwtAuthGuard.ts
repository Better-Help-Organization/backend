
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserTypes } from '../constants';

// TODO: add this to the guards
type IArgs = {
  roles?: UserTypes[]
  // status?: BaseStatus[]
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
        console.log({isAuthenticated})

      // const request = context.switchToHttp().getRequest();
      // const user = request.user as TokenPayload;
      // console.log({user})
      // // ✅ Always allow ADMIN users to pass any guard
      // if (user?.type === UserTypes.ADMIN) {
      //   return true;
      // }

      if (!isAuthenticated)  return false;

      // const user = context.switchToHttp().getRequest().user;
      // if (this.args?.roles && this.args?.roles.length > 0) {
      //   if (!this.args.roles.includes(user?.kind)) return false;
      // }

      // if (this.args?.status && this.args?.status.length > 0) {
      //   if (!this.args.status.includes(user?.status)) return false;
      // }


      // const request = context.switchToHttp().getRequest();
      // const user = request.user as TokenPayload;
      // console.log({user})
      // // ✅ Always allow ADMIN users to pass any guard
      // if (user?.type === UserTypes.ADMIN) {
      //   return true;
      // }

      return true; // Allow access if all checks pass or if no role or status is required
        
    }
  }
    return  JwtAuthGuardStrategy
  }