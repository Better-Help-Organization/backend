import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { TokenPayload } from 'src/common/constants';

@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() client: TokenPayload, @Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.create(client, createAnswerDto);
  }

  @ApiFindAllQueryParams()
  @Get()
  findAll() {
    return this.answerService.findAll();
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.answerService.findOne(id);
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
