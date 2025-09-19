import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { TokenPayload, UserTypes } from '../constants';

/**
 * Usage: 
 * @AllowAdminAccess(UserTypes.DRIVER) token: TokenPayload
 * Automatically uses `req.params.id` as the mockId.
 */
export const AllowAdminAccess = (accessTo: Exclude<UserTypes, UserTypes.ADMIN>) =>
  createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user as TokenPayload; // from JwtAuthGuard
    const mockId = request.params?.id;

    if (!mockId) {
      throw new InternalServerErrorException('Param "id" is required for AllowAdminAccess decorator');
    }

    // Resolve AuthService dynamically via request-scoped provider
    const authService: AuthService = request.authService;
    if (!authService) {
      throw new InternalServerErrorException('AuthService not available in request. Attach it via middleware or use request-scoped DI.');
    }

    // Call your original logic
    return authService._allowAdminAccess(user, mockId, accessTo);
  })();
