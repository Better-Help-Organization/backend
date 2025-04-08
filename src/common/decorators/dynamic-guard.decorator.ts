import { SetMetadata, CanActivate } from '@nestjs/common';

export const DYNAMIC_GUARD_KEY = 'dynamicGuards'
export const DynamicGuards = (...guards: (CanActivate | Function)[]) => SetMetadata(DYNAMIC_GUARD_KEY, guards);
