import { registerDecorator, ValidationOptions } from 'class-validator';
import { PasswordValidator } from 'src/common/validators/password.valiator';

export function ValidPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: PasswordValidator,
    });
  };
}