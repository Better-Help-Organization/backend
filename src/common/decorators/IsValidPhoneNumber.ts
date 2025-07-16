import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsValidPhoneNumberConstraint } from 'src/common/validators/phone-number.validator';

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsValidPhoneNumberConstraint,
        });
    };
}
