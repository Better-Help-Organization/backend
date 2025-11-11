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
{
    name: DefaultParameters.PENDING_SESSION_EXPIRY_IN_MINUTES,
    value: '0.1',
},
{
    name: DefaultParameters.MATCH_EXPIRY_IN_MINUTES,
    value: '4320',
}] as  Parameter[];
