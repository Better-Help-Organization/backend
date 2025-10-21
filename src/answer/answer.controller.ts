import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,Req } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { Request } from 'express';

@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() client: TokenPayload, @Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.create(client, createAnswerDto);
  }

  @ApiFindAllQueryParams()
    @DynamicGuards(
    new AdminJwtAuthGuard()
  )  
  @Get('user-ans')
  findClientsWhoFilledAllGroupAnswers(
  @Query() query: FindAllQueryParams
  ) {
    return this.answerService.findClientsWhoFilledAllGroupAnswers(query);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.answerService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )  @Get(':id')
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.answerService.findOne(id, query);
  }



  @Patch(':id')
  @UseGuards(ClientJwtAuthGuard)
  update(@CurrentUser() client: TokenPayload, @Param('id') id: string, @Body() updateAnswerDto: UpdateAnswerDto) {
    return this.answerService.update(client, id, updateAnswerDto);
  }

  @Delete(':id')
  @UseGuards(ClientJwtAuthGuard)
  remove(@CurrentUser() client: TokenPayload, @Param('id') id: string) {
    return this.answerService.remove(id);
  }
}
