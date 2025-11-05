import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { TokenPayload, UserTypes } from '../constants';


export const AllowAdminAccess = (accessTo: Exclude<UserTypes, UserTypes.ADMIN>) =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user as TokenPayload; // from JwtAuthGuard
    const mockId = request.query?.mockId;
    // console.log({user})
    console.log(mockId,'mockId  allowadminaccess.ts:16 - allow-admin-acess.ts:17');

    if (user.type === accessTo)  return user;

    else if (user.type === UserTypes.ADMIN) {
     
    if (!mockId) {
      throw new InternalServerErrorException('Param "id" is required for admin access');
    }
    const authService: AuthService = request.authService;
    
    // const authService = moduleRef.get(AuthService, { strict: false });
    if (!authService) {
      throw new InternalServerErrorException('Unable to resolve AuthService');
    }

    // Call your original logic
    return authService._allowAdminAccess(user, mockId, accessTo);
  }
})();
