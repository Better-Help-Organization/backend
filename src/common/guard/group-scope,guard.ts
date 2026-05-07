import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class GroupScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.groupScope = true;
    return true;
  }
}
