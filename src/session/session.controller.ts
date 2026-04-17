 import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { AllowAdminAccess } from 'src/common/decorators/allow-admin-acess';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFilterByDate, ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { AddToSessionDto } from './dto/add-session.dto';
import { BatchUpdateSessionDto } from './dto/batch-update-session.dto';
import { CreateGroupSession, CreateSessionDto } from './dto/create-session.dto';
import { RemoveFromSessionDto } from './dto/remove-session.dto';
import { SelectSessionDto } from './dto/select-session.dto';
import { AssignSessionDto, AttendanceDto, UpdateGroupSessionNote, UpdateSessionDto } from './dto/update-session.dto';
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

  @ApiQuery({ 
      name: 'mockId', 
      required: false, 
      type: String, 
  })
  @Post()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  bookASession(
    @AllowAdminAccess(UserTypes.THERAPIST) user: TokenPayload,
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

  @Post(':sessionId/remove-from-session')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  removeFromSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: TokenPayload,
    @Body() removeFromSession: RemoveFromSessionDto
  ) {
    return this.sessionService.removeFromSession(sessionId, removeFromSession);
  }

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  @ApiFindAllQueryParams()
  @ApiFilterByDate()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.sessionService.findAll(queryparams, queryparams.startDate, queryparams.endDate);
  }

  @Get("time")
  time(
    @Query() queryparams?: FindAllQueryParams
  ) {
  return {
    utc: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    utc_plus_3: new Date().toISOString()
  }

    return this.sessionService.findAll(queryparams, queryparams.startDate, queryparams.endDate);
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

  @Patch('batch')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  batchUpdate(@Body() dto: BatchUpdateSessionDto) {
    return this.sessionService.batchUpdate(dto);
  }

  @Patch('group-notes/:id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new TherapistJwtAuthGuard()
  )
  updateGroupSessionNotes(
    @Param('id') id: string,
    @Body() dto: UpdateGroupSessionNote
  ) {
    return this.sessionService.updateBatchTherapistNotes(id, dto);
  }

  @Patch('attendance/:id')
  @DynamicGuards(
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
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

  @Post('group-attendance/:id')
    @DynamicGuards(
    new ClientJwtAuthGuard(),
  )
  async markClientAttendance(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ) {
    return await this.sessionService.markAttendance(id, user.id);
  }



  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
  )
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
