import { ValidateIf } from "class-validator";

export const RequiredIfPropertyMissing = (property: string) =>
    ValidateIf((dto: any) => typeof dto[property] === 'undefined');
  