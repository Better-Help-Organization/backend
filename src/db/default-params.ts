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
},
{
    name: DefaultParameters.SESSION_HOUR,
    value: '45',
},
{
    name: DefaultParameters.ADVANCED_PRICE_PERCENTAGE,
    value: '0.5',
},
{
    name: DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE,
    value: '0.3',
},
{
    name: DefaultParameters.MODERATE_PRICE_PERCENTAGE,
    value: '0.3',
},
{
    name: DefaultParameters.COUPLE_PRICE_PERCENTAGE,
    value: '0.3',
},
{
    name: DefaultParameters.GROUP_PRICE_PERCENTAGE,
    value: '0.3',
},
] as  Parameter[];
