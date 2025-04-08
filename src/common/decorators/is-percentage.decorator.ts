// import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// export function IsPercentage(validationOptions?: ValidationOptions) {
//   return function (object: Object, propertyName: string) {
//     registerDecorator({
//       name: 'isPercentage',
//       target: object.constructor,
//       propertyName: propertyName,
//       options: validationOptions,
//       validator: {
//         validate(value: any, args: ValidationArguments) {
//           return typeof value === 'number' && value >= 0 && value <= 1;
//         },
//         defaultMessage(args: ValidationArguments) {
//           return `${args.property} must be a number between 0 and 1`;
//         },
//       },
//     });
//   };
// }
