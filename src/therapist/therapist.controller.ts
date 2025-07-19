import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { TokenPayload } from 'src/common/constants';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams } from 'src/common/middlewares/api-features.dto';

@Controller('therapist')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get('me')
  @UseGuards(TherapistJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    return await this.therapistService.findOne(user.id,queryParams);
  }

  
  @Get()
  @DynamicGuards(
new AdminJwtAuthGuard()  
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.therapistService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.therapistService.findOne(id, queryParams);
  }

  @Patch('me')
  @DynamicGuards(
  new TherapistJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateTherapistDto: UpdateTherapistDto ) {
    return this.therapistService.update(user.id, updateTherapistDto);
  }

  @Patch(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateTherapistDto: UpdateTherapistDto) {
    return this.therapistService.update(id, updateTherapistDto);
  }

  @Delete(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.therapistService.remove(id);
  }
}
