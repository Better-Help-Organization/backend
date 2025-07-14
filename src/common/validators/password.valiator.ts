import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
  } from 'class-validator';
  
  @ValidatorConstraint({ name: 'isValidPassword', async: false })
  export class PasswordValidator implements ValidatorConstraintInterface {
    validate(password: string, _args: ValidationArguments): boolean {
      return /^(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
    }
  
    defaultMessage(_args: ValidationArguments): string {
      return 'Password must contain only letters and numbers. Minimum length is 8 characters.';
    }
  }
  