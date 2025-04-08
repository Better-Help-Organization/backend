
// export function SkipSmsIfDisabled() {
//   return function <T extends { new (...args: any[]): {} }>(constructor: T) {
//     return class extends constructor {
//       constructor(...args: any[]) {
//         super(...args);

//         // Wrap all methods using a Proxy
//       return new Proxy(this, {
//           get(target, prop: string, receiver) {
//             const originalMethod = target[prop];

//             if (typeof originalMethod === 'function' && prop !== 'constructor') {
//               return function (...args: any[]) {
//                 if (!constructor['isSmsEnabled']) {
//                   // target.logger?.log(`Skipping SMS: ${prop}()`);
//                   return;
//                 }
//                 return originalMethod.apply(target, args);
//               };
//             }
//             return Reflect.get(target, prop, receiver);
//           },
//         });
//       }
//     };
//   };
// }