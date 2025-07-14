import { Column, Entity } from 'typeorm';
import { CommonEntity } from './common.entity';
import 'reflect-metadata';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseStatus, Gender, LANG } from '../constants';

export class User extends CommonEntity {

    @ApiProperty()
    @Column()
    firstName: string;

    @ApiProperty()
    @Column()
    lastName: string;

    @Exclude()
    @ApiProperty({ nullable: true })
    @Column({nullable:true})
    OTP: string

    @Exclude()
    @ApiProperty({ nullable: true })
    @Column({ type: 'timestamp', nullable: true })
    OTPExpires: Date

    @ApiProperty()
    @Column({ unique: true })
    email: string;

        @ApiProperty({ default: false })
    @Column({default: false })
    isEmailAuthenticated: boolean;

    @Exclude()
    @ApiProperty({ nullable: true })
    @Column({
        nullable: true
    })
    firebaseToken: string;

    @Exclude()
    @ApiProperty({ nullable: true })
    @Column({ nullable: true })
    refreshToken: string;

    @Exclude()
    @ApiProperty()
    @Column()
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

    @ApiProperty({
    enum: LANG,
    })
    @Column({
        type: "enum",
        enum: LANG,
    })
    lang: LANG;

    @ApiProperty({ nullable: false })
    @Column({ type: 'timestamp', nullable: false })
    dob: Date;

}