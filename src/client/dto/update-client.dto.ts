import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { UpdateUserDto } from 'src/common/dto/update-user.dto';

export class UpdateClientDto extends UpdateUserDto {}
