import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isValidPhoneNumber', async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
    validate(phoneNumber: string, _args: ValidationArguments) {
        return /^[97]\d{8}$/.test(phoneNumber); // Ensures 9 digits, starting with 9 or 7
    }

    defaultMessage(_args: ValidationArguments) {
        return 'Invalid phone number. It must start with 9 or 7 and be exactly 9 digits long.';
    }
}
