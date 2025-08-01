import { Controller, Post, Body, Param, Patch, Delete, Get, UseGuards } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() token: TokenPayload, @Body() dto: CreateRatingDto) {
    return this.ratingService.create(token, dto);
  }

  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findAll() {
    return this.ratingService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string) {
    return this.ratingService.findOne(id);
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
