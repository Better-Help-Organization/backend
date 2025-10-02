import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams } from 'src/common/middlewares/api-features.dto';
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
  @UseGuards(TherapistJwtAuthGuard)
  async accept(
    @CurrentUser() therapist: TokenPayload,
    @Body() acceptMatchDto: AcceptMatchDto
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
  findAll() {
    return this.matchService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  @ApiFindOneQueryParams()
  findOne(@Param('id') id: string) {
    return this.matchService.findOne(id);
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
