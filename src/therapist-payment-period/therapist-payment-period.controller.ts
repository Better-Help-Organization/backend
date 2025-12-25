import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { AllowAdminAccess } from 'src/common/decorators/allow-admin-acess';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFilterByDate, ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
import { TherapistStatisticsService } from 'src/therapist/therapist.stats';
import { CreateTherapistPaymentPeriodDto } from './dto/create-therapist-payment-period.dto';
import { UpdateTherapistPaymentPeriodDto } from './dto/update-therapist-payment-period.dto';
import { TherapistPaymentPeriodService } from './therapist-payment-period.service';

@Controller('therapist-payment-period')
export class TherapistPaymentPeriodController {
  constructor(
    private readonly therapistPaymentPeriodService: TherapistPaymentPeriodService,
    private readonly stats: TherapistStatisticsService,
  ) {}

    
  @Get('rot')
  @ApiFilterByDate()
  @ApiQuery({ 
    name: 'mockId', 
    required: false, 
    type: String, 
  })
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  rot(
    @AllowAdminAccess(UserTypes.THERAPIST) therapist: TokenPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('mockId') mockId?: string
  ) {
    if (mockId) {
      therapist = { id: mockId } as TokenPayload;
    }
    return this.stats.getRevenueOverTime(startDate, endDate, therapist.id);
  }
  
  @Post()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  create(@Body() createTherapistPaymentPeriodDto: CreateTherapistPaymentPeriodDto) {
    return this.therapistPaymentPeriodService.create(createTherapistPaymentPeriodDto);
  }

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.therapistPaymentPeriodService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.therapistPaymentPeriodService.findOne(id, queryParams);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTherapistPaymentPeriodDto: UpdateTherapistPaymentPeriodDto) {
    return this.therapistPaymentPeriodService.update(id, updateTherapistPaymentPeriodDto);
  }

  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  remove(@Param('id') id: string) {
    return this.therapistPaymentPeriodService.remove(id);
  }
}
