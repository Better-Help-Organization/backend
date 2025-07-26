import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import 'reflect-metadata';
import { Column } from 'typeorm';
import { BaseStatus, Gender } from '../constants';
import { CommonEntity } from './common.entity';

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

    @ApiProperty()
    @Column({ unique:true, nullable: true })
    phoneNumber: string;

    @ApiProperty({ default: false })
    @Column({default: false })
    isEmailAuthenticated: boolean;

    @ApiProperty({ default: false })
    @Column({default: false })
    isPhoneNumberAuthenticated: boolean;

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