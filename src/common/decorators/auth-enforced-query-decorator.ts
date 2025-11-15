import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { TokenPayload, UserTypes } from '../constants';

export const GroupScope = createParamDecorator( 
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest(); 
        request.groupScope = true;
        return true;
      },
);


export const AuthEnforcedQueryParams = createParamDecorator(
  (data: ClassConstructor<any>, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;
    const user: TokenPayload = request.user;

    // Parse existing filters into an array
    let filters = query.filters ? query.filters.split(',') : [];

    // Remove any previous filters on client/therapist/group
    filters = filters.filter((filter) => {
      const [key] = filter.split(/(=|>=|<=|<|>)/);
      return !['client.id', 'therapist.id', 'group.id'].includes(key.trim());
    });

    let enforcedFilter = '';

    if (user.type === UserTypes.CLIENT) {
          const userIdFilter = `${user.id}`;

      // Include sessions where client is the user OR user is in the group
      console.log(`request.groupScope`, request.groupScope);  
      if (request.groupScope) {
          enforcedFilter = `(client.id:=${user.id}||group.id:=${user.id})`;
        }
        else{
          enforcedFilter = `client.id:=${userIdFilter}`;
        }
    } else if (user.type === UserTypes.THERAPIST) {
      // Only filter on therapist for now
      enforcedFilter = `therapist.id:=${user.id}`;
    } else {
      throw new Error('Invalid user type');
    }

    // Merge user filters with any existing filters
    const mergedFilters = [...filters, enforcedFilter].filter(Boolean);

    // Store them back in query.filters for downstream use
    query.filters = mergedFilters.join(',');

    console.log('merged filters', query.filters);

    return plainToInstance(data, { ...query }, { enableImplicitConversion: true });
  }
);
