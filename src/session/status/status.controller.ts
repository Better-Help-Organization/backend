import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';

import { CreateStatusDto } from '../dto/status/create-status.dto';
import { UpdateStatusDto } from '../dto/status/update-status.dto';
import { StatusService } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post(':sessoinId')
  @DynamicGuards(
    new  TherapistJwtAuthGuard(),
    new  AdminJwtAuthGuard(),
    new  ClientJwtAuthGuard()
  )
  create(
    @CurrentUser() user: TokenPayload,
    @Param('sessoinId') sessionId: string,
    @Body() createStatusDto: CreateStatusDto) {
    return this.statusService.create(sessionId, createStatusDto);
  }

  @Get()
  @DynamicGuards(
    new  TherapistJwtAuthGuard(),
    new  AdminJwtAuthGuard(),
    new  ClientJwtAuthGuard()
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.statusService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
  new  TherapistJwtAuthGuard(),
  new  AdminJwtAuthGuard(),
  new  ClientJwtAuthGuard()
)
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.statusService.findOne(id, queryParams);
  }

  @Patch(':id')
  @DynamicGuards(
  new  AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.statusService.update(id, updateStatusDto);
  }

  @Delete(':id')
  @DynamicGuards(
  new  AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.statusService.remove(+id);
  }
}
