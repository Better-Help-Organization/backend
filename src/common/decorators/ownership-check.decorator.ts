import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { OwnershipGuard } from 'src/common/guard/ownership.guard';
import { UserTypes } from '../constants';

export const OWNERSHIP_ENTITY = 'OWNERSHIP_ENTITY';
export const OWNERSHIP_RELATIONS = 'OWNERSHIP_RELATIONS';
export const OWNERSHIP_ALLOWED_TYPES = 'OWNERSHIP_ALLOWED_TYPES';

export function OwnershipCheck(
  entity: Function,
  relations: string | string[],
  ...allowedUserTypes: UserTypes[]
) {
  const relArray = Array.isArray(relations) ? relations : [relations];

  return applyDecorators(
    SetMetadata(OWNERSHIP_ENTITY, entity),
    SetMetadata(OWNERSHIP_RELATIONS, relArray),
    SetMetadata(OWNERSHIP_ALLOWED_TYPES, relArray),
    UseGuards(OwnershipGuard),
  );
}
