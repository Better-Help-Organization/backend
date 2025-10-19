import { ApiProperty } from '@nestjs/swagger';
import 'reflect-metadata';
import { Column, Entity } from 'typeorm';
import { BaseStatus } from '../constants';
import { User } from './user.entity';

@Entity()
export class Admin extends User {
      @ApiProperty({ enum: BaseStatus, default: BaseStatus.INACTIVE })
      @Column({
          type: "enum",
          default: BaseStatus.ACTIVE,
          enum: BaseStatus,
      })
      status: BaseStatus;
}