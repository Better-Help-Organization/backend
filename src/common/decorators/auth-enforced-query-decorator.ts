import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { TokenPayload, UserTypes } from '../constants';

export const AuthEnforcedQueryParams = createParamDecorator(
  (data: ClassConstructor<any>, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;
    const user: TokenPayload = request.user;

    const userIdFilter = `${user.id}`;
    let filters = query.filters ? query.filters.split(',') : [];

    // Remove any previous filters on client/therapist/group
    filters = filters.filter((filter) => {
      const [key] = filter.split(/(=|>=|<=|<|>)/);
      return !['client.id', 'therapist.id', 'group.id'].includes(key.trim());
    });

    let enforcedFilter = '';

    if (user.type === UserTypes.CLIENT) {
      // Allow chats where client is the user or user is in the group
      enforcedFilter = `(client.id=${userIdFilter}|group.id=${userIdFilter})`;
    } else if (user.type === UserTypes.THERAPIST) {
      // Only filter on therapist for now
      enforcedFilter = `therapist.id=${userIdFilter}`;
    } else {
      throw new Error('Invalid user type');
    }

    filters.push(enforcedFilter);
    query.filters = filters.join(',');

    return plainToInstance(data, query, { enableImplicitConversion: true });
  }
);


// export const AuthEnforcedQueryParams = createParamDecorator(
//   (data: ClassConstructor<any>, ctx: ExecutionContext) => {
    
//     let roleKey = '';
//     const request = ctx.switchToHttp().getRequest();
//     const query = request.query;
//     const user: TokenPayload = request.user
//     const userIdFilter = `${user.id}`;
//     console.log({type:user.type})
//     if (Object.values(UserTypes).includes(user.type)) roleKey = `${user.type}.id`;
//     else throw new Error('Invalid user type');
//     console.log(query.filters)
//     const filters = query.filters ? query.filters.split(',') : [];
//     const updatedFilters = filters
//         .filter((filter) => {
//         const [key] = filter.split(/(=|>=|<=|<|>)/);
//         return !(key.trim() === roleKey);
//         })
//         .concat(`${roleKey}=${userIdFilter}`);

//     query.filters = updatedFilters.join(',');
//     return plainToInstance(data, query, { enableImplicitConversion: true })
//    }
// );
