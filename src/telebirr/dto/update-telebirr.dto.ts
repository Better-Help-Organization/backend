import { PartialType } from '@nestjs/swagger';
import { CreateTelebirrDto } from './create-telebirr.dto';

export class UpdateTelebirrDto extends PartialType(CreateTelebirrDto) {}
