import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingService } from './rating.service';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() token: TokenPayload, @Body() dto: CreateRatingDto) {
    return this.ratingService.create(token, dto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findAll(
    @Query() queryParams,
  ) {
    return this.ratingService.findAll(queryParams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.ratingService.findOne(id, queryParams);
  }

  @Patch(':id')
  @UseGuards(ClientJwtAuthGuard)
  update(
    @CurrentUser() token: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.ratingService.update(token, id, dto);
  }

  @Delete(':id')
  @UseGuards(ClientJwtAuthGuard)
  remove(@CurrentUser() token: TokenPayload, @Param('id') id: string) {
    return this.ratingService.remove(token, id);
  }
}
