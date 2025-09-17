import { DefaultParameters } from 'src/common/constants';
import { Parameter } from 'src/common/entities/parameter.entity';

export const defaultParams: Parameter[] = [
{
    name: DefaultParameters.VAT,
    value: '0.15',
},
{
    name: DefaultParameters.NOTIFICATION_EXPIRY,
    value: '3',
},
] as  Parameter[];
