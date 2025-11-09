import { Injectable, NestMiddleware } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class AuthServiceMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: any, _res: any, next: () => void) {
    req.authService = this.authService;
    next();
  }
}
