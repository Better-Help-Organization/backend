import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateMoodDto } from './dto/create-mood.dto';
import { MoodService } from './mood.service';

@Controller('mood')
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(
    @Body() createMoodDto: CreateMoodDto,
    @CurrentUser() user: TokenPayload
  ) {
    return this.moodService.create(user.id, createMoodDto);
  }

  @Get()
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryParams,
  ) {
    return this.moodService.findAll(queryParams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.moodService.findOne(id, queryParams);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMoodDto: UpdateMoodDto) {
  //   return this.moodService.update(+id, updateMoodDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.moodService.remove(+id);
  // }
}
