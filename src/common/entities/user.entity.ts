import { Column } from 'typeorm';
import { CommonEntity } from './common.entity';
import 'reflect-metadata';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseStatus, Gender, LANG } from '../constants';

export abstract class User extends CommonEntity {

    @ApiProperty()
    @Column()
    firstName: string;

    @ApiProperty()
    @Column()
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

    // @ApiProperty({
    //     type: "enum",
    //     enum: Gender,
    // })
    // @Column({
    //     type: "enum",
    //     enum: LANG,
    // })
    // lang: LANG;

    @ApiProperty({ nullable: false })
    @Column({ type: 'timestamp', nullable: false })
    dob: Date;

}