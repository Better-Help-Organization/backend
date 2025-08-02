import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { TokenPayload, UserTypes } from '../constants';

export const AuthEnforcedQueryParams = createParamDecorator(
  (data: ClassConstructor<any>, ctx: ExecutionContext) => {
    
    let roleKey = '';
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;
    const user: TokenPayload = request.user
    const userIdFilter = `${user.id}`;
    console.log({type:user.type})
    if (Object.values(UserTypes).includes(user.type)) roleKey = `${user.type}.id`;
    else throw new Error('Invalid user type');
    console.log(query.filters)
    const filters = query.filters ? query.filters.split(',') : [];
    const updatedFilters = filters
        .filter((filter) => {
        const [key] = filter.split(/(=|>=|<=|<|>)/);
        return !(key.trim() === roleKey);
        })
        .concat(`${roleKey}=${userIdFilter}`);

    query.filters = updatedFilters.join(',');
    return plainToInstance(data, query, { enableImplicitConversion: true })
   }
);
