import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { DynamicGuard , } from './dynamic.guard';
import { DYNAMIC_GUARD_KEY } from '../decorators/dynamic-guard.decorator';


export function ConditionalGuards(guards: any[]) {
  return applyDecorators(
    SetMetadata(DYNAMIC_GUARD_KEY, process.env.NODE_ENV === 'prod' ? guards : []),
    UseGuards(DynamicGuard),
  );
}
