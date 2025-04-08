// import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { ClassConstructor, plainToInstance } from 'class-transformer';
// import { RepoTypes, TokenPayload } from '../constants';

// export const FilterEnforcedQueryParams = createParamDecorator(
//   (data: ClassConstructor<any>, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     const query = request.query;
//     const user: TokenPayload = request.user

//     if (user.userId) {
//         let roleKey = '';
//         const userIdFilter = `${user.userId}`;
      
//         // Determine the role-specific key
//         switch (user.kind) {
//           case RepoTypes.DRIVER:
//             roleKey = 'driver.id';
//             break;
//           case RepoTypes.ADMIN:
//             roleKey = 'admin.id';
//             break;
//           case RepoTypes.COOR:
//             roleKey = 'coor.id';
//             break;
//           case RepoTypes.USER:
//             roleKey = 'user.id';
//             break;
//           default:
//             throw new Error('Invalid user kind or role');
//         }
      
//         const filters = query.filters ? query.filters.split(',') : [];
//         const updatedFilters = filters
//           .filter((filter) => {
//             const [key] = filter.split(/(=|>=|<=|<|>)/);
//             return !(key.trim() === roleKey);
//           })
//           .concat(`${roleKey}=${userIdFilter}`);
      
//         query.filters = updatedFilters.join(',');
//         return plainToInstance(data, query, { enableImplicitConversion: true })
//       }
//   },
// );
