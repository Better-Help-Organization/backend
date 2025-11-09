import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AcceptMatchDto } from './dto/accept-match.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchService } from './match.service';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  async create(
    @CurrentUser() client: TokenPayload,
    @Body() createMatchDto: CreateMatchDto
  ) {
    return this.matchService.create(client, createMatchDto);
  }

  @Post('/accept')
  @ApiQuery({ 
      name: 'mockId', 
      required: false, 
      type: String, 
    })
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  async accept(
    @CurrentUser() therapist: TokenPayload,
    @Body() acceptMatchDto: AcceptMatchDto,
    @Query('mockId') mockId?: string
  ) {
    return await this.matchService.acceptMatch(therapist, acceptMatchDto);
  }


  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  @ApiFindAllQueryParams()
  findAll(
        @Query() queryparams?: FindAllQueryParams
  ) {
    return this.matchService.findAll(queryparams);
  }

  @Get(':id')
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  @ApiFindOneQueryParams()
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.matchService.findOne(id, queryParams);
  }

  // @Patch(':id')
  // @UseGuards(ClientJwtAuthGuard)
  // update(@CurrentUser() client: TokenPayload, @Param('id') id: string, @Body() updateMatchDto: UpdateMatchDto) {
  //   return this.matchService.update(client, id, updateMatchDto);
  // }

  @Delete(':id')
  // @UseGuards(ClientJwtAuthGuard)
  @UseGuards(AdminJwtAuthGuard)  
  remove(@CurrentUser() token: TokenPayload, @Param('id') id: string) {
    return this.matchService.remove(token, id);
  }
}
