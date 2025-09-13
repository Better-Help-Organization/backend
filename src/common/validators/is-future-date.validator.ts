import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsFutureDateOrDateTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDateOrDateTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          
          const date = new Date(value);
          if (isNaN(date.getTime())) return false; // invalid date

          const now = new Date();

          // If value is just a date (no time), only compare YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const valueDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return valueDateOnly >= nowDateOnly;
          }

          // Otherwise, it's a datetime — compare full timestamp
          return date > now;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date or datetime`;
        },
      },
    });
  };
}
