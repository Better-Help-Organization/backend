import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { AllowAdminAccess } from 'src/common/decorators/allow-admin-acess';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AcceptMatchDto } from './dto/accept-match.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchService } from './match.service';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  @ApiQuery({ 
      name: 'mockId', 
      required: false, 
      type: String, 
    })
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  async create(
    @AllowAdminAccess(UserTypes.CLIENT) client: TokenPayload,
    @Body() createMatchDto: CreateMatchDto,
    @Query('mockId') mockId?: string
  ) {
    return this.matchService.create(client, createMatchDto, mockId);
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
    @AllowAdminAccess(UserTypes.THERAPIST) therapist: TokenPayload,
    @Body() acceptMatchDto: AcceptMatchDto,
    @Query('mockId') mockId?: string
  ) {
    return await this.matchService.acceptMatch(therapist, acceptMatchDto, mockId);
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

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(@CurrentUser() admin: TokenPayload, @Param('id') id: string, @Body() updateMatchDto: UpdateMatchDto) {
    return this.matchService.update(admin, id, updateMatchDto);
  }

  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard)  
  remove(@CurrentUser() token: TokenPayload, @Param('id') id: string) {
    return this.matchService.remove(token, id);
  }
}
