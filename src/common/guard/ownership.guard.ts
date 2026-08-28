import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNERSHIP_ALLOWED_TYPES, OWNERSHIP_ENTITY } from 'src/common/decorators/ownership-check.decorator';
import { DataSource } from 'typeorm';
import { OWNERSHIP_RELATIONS } from '../decorators/ownership-check.decorator';


@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
   private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const entityClass = this.reflector.get(OWNERSHIP_ENTITY, context.getHandler());
    const relations = this.reflector.get(OWNERSHIP_RELATIONS, context.getHandler());
    const allowedUserTypes = this.reflector.get(OWNERSHIP_ALLOWED_TYPES, context.getHandler());

    console.log({entityClass, relations, allowedUserTypes, userType:user.type});
    if (!entityClass) return true;

    // extract the :id param
    const id = req.params?.id;

    // permission: user type must be allowed
    if (!allowedUserTypes.includes(user.type)) {
        // return true
        throw new ForbiddenException('Your user type cannot access this resource');
    }

    const repo = this.dataSource.getRepository(entityClass);

    // dynamically load the owner relations
    const entity = await repo.findOne({
      where: { id },
      relations,
    });
    console.log({entity});
    if (!entity) {
        // return true
        throw new ForbiddenException('Entity not found');
    }

    // check ownership against all allowed relations
    const owns = relations.some(rel => {
      const owner = entity[rel];

      if (!owner) return false;

      // relation may be object or primitive foreign key
      return owner?.id === user.id || owner === user.id;
    });

    if (!owns) {
        // return true
        console.log({name:entity.constructor.name})
        throw new ForbiddenException(`You do not own this ${entity.constructor.name? entity.constructor.name.toLowerCase(): 'resource'}`);
    }

    return true;
  }
}
