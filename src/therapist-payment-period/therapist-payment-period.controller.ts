import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateTherapistPaymentPeriodDto } from './dto/create-therapist-payment-period.dto';
import { UpdateTherapistPaymentPeriodDto } from './dto/update-therapist-payment-period.dto';
import { TherapistPaymentPeriodService } from './therapist-payment-period.service';

@Controller('therapist-payment-period')
export class TherapistPaymentPeriodController {
  constructor(private readonly therapistPaymentPeriodService: TherapistPaymentPeriodService) {}

  @Post()
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
  remove(@Param('id') id: string) {
    return this.therapistPaymentPeriodService.remove(id);
  }
}
