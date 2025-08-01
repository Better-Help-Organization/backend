import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @UseGuards(TherapistJwtAuthGuard)
  create(
    @CurrentUser() token: TokenPayload,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(token, dto);
  }

  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findAll(@Query() queryParams: FindAllQueryParams) {
    return this.availabilityService.findAll(queryParams);
  }

  @Get(':id')
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string, @Query() queryParams: FindOneQueryParams) {
    return this.availabilityService.findOne(id, queryParams);
  }

  @Patch(':id')
  @UseGuards(TherapistJwtAuthGuard)
  update(
    @CurrentUser() token: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(token, id, dto);
  }

  @Delete(':id')
  @UseGuards(TherapistJwtAuthGuard)
  remove(@CurrentUser() token: TokenPayload, @Param('id') id: string) {
    return this.availabilityService.remove(token, id);
  }
}