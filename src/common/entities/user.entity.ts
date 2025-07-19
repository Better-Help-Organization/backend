import { Column } from 'typeorm';
import { CommonEntity } from './common.entity';
import 'reflect-metadata';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseStatus, Gender, LANG } from '../constants';

export abstract class User extends CommonEntity {

    @ApiProperty()
    @Column({ nullable: true })
    firstName: string;

    @ApiProperty()
    @Column({ nullable: true })
    lastName: string;

    @Exclude()
    @ApiHideProperty()
    @Column({nullable:true})
    OTP: string

    @Exclude()
    @ApiHideProperty()
    @Column({ type: 'timestamp', nullable: true })
    OTPExpires: Date

    @ApiProperty()
    @Column({ unique: true })
    email: string;

    @ApiProperty({ default: false })
    @Column({default: false })
    isEmailAuthenticated: boolean;

    @Exclude()
    @ApiHideProperty()
    @Column({
        nullable: true
    })
    firebaseToken: string;

    @Exclude()
    @ApiHideProperty()
    @Column({ nullable: true })
    refreshToken: string;

    @Exclude()
    @ApiHideProperty()
    @Column({ nullable: true })
    password: string;

    @ApiProperty({ enum: BaseStatus, default: BaseStatus.INACTIVE })
    @Column({
        type: "enum",
        default: BaseStatus.INACTIVE,
        enum: BaseStatus,
    })
    status: BaseStatus;

    @ApiProperty({
    enum: Gender,
    })
    @Column({
        type: "enum",
        enum: Gender,
    })
    gender: Gender;

    @ApiProperty({ nullable: true })
    @Column({ type: 'timestamp', nullable: true })
    dob: Date;

    @ApiProperty({ default: false })
    @Column({ default: false })
    isLinked: boolean;
}