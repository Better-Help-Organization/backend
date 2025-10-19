import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AddToSessionDto } from './dto/add-session.dto';
import { CreateGroupSession, CreateSessionDto } from './dto/create-session.dto';
import { SelectSessionDto } from './dto/select-session.dto';
import { AssignSessionDto, AttendanceDto, UpdateSessionDto } from './dto/update-session.dto';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService
  ) {}

  // @Post()
  // create(@Body() createSessionDto: CreateSessionDto) {
  //   return this.sessionService.create(createSessionDto);
  // }


  @Post("group")
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  bookAGroupSession(
    @CurrentUser() user: TokenPayload,
    @Body() createGroupSessionDto: CreateGroupSession
  ) {
    return this.sessionService.createGroupSession(createGroupSessionDto);
  }

  @Post()
  @DynamicGuards(
    new TherapistJwtAuthGuard()
  )
  bookASession(
    @CurrentUser() user: TokenPayload,
    @Body() createSessionDto: CreateSessionDto
  ) {
    return this.sessionService.create(user.id, createSessionDto);
  }

  @Post('select')
  @DynamicGuards(new ClientJwtAuthGuard())
  selectSession(
    @CurrentUser() user: TokenPayload,
    @Body() dto: SelectSessionDto
  ) {
    return this.sessionService.selectSession(user, dto);
  }

  @Post(":sessionId/add-to-session")
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  addToSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: TokenPayload,
    @Body() addToSession: AddToSessionDto
  ) {
    return this.sessionService.addToSession(sessionId, addToSession);
  }

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.sessionService.findAll(queryparams);
  }

  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  @ApiFindOneQueryParams()
  findOne(
    @Param('id') id: string,
    @Query() queryParams: FindOneQueryParams,
  ) {
    return this.sessionService.findOne(id, queryParams);
  }

  @Patch(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  update(
    @Param('id') id: string, 
    @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionService.update(id, updateSessionDto);
  }

  @Patch('attendance/:id')
  @DynamicGuards(
    new ClientJwtAuthGuard()
  )
  attendance(
    @Param('id') id: string, 
    @Body() updateSessionDto: AttendanceDto) {
    return this.sessionService.update(id, updateSessionDto);
  }


  @Patch('assign/:id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  assign(
    @Param('id') id: string, 
    @Body() assignSessionDto: AssignSessionDto) {
    return this.sessionService.update(id, assignSessionDto);
  }


  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
