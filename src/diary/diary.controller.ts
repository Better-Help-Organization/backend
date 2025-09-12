import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { DiaryService } from './diary.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';

@Controller('diary')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  @DynamicGuards(
     new  ClientJwtAuthGuard()
  )
  create(
  @CurrentUser() user: TokenPayload,
  @Body() createDiaryDto: CreateDiaryDto
  ) {
    return this.diaryService.create(user, createDiaryDto);
  }

  @Get()
  findAll() {
    return this.diaryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diaryService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiaryDto: UpdateDiaryDto) {
    return this.diaryService.update(id, updateDiaryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diaryService.remove(id);
  }
}
