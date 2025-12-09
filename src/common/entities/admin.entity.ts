import { ApiProperty } from '@nestjs/swagger';
import 'reflect-metadata';
import { Column, Entity } from 'typeorm';
import { AdminRoles, BaseStatus } from '../constants';
import { User } from './user.entity';

@Entity()
export class Admin extends User {
      @ApiProperty({ enum: BaseStatus, default: BaseStatus.INACTIVE })
      @Column({
          type: "enum",
          default: BaseStatus.INACTIVE,
          enum: BaseStatus,
      })
      status: BaseStatus;


    @ApiProperty({ enum: AdminRoles, default: AdminRoles.SUPPORT })
      @Column({
          type: "enum",
          default: AdminRoles.SUPPORT,
          enum: AdminRoles,
      })
      role: AdminRoles;
}