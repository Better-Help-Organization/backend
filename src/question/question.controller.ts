import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @UseGuards(AdminJwtAuthGuard)
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.questionService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new TherapistJwtAuthGuard(),
  )
  @UseGuards(AdminJwtAuthGuard)
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.questionService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.questionService.remove(id);
  }
}
