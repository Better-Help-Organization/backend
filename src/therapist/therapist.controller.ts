import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ChatService } from 'src/chat/chat.service';
import { TokenPayload } from 'src/common/constants';
import { AuthEnforcedQueryParams } from 'src/common/decorators/auth-enforced-query-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { TherapistService } from './therapist.service';

@Controller('therapist')
export class TherapistController {
  constructor(
    private readonly therapistService: TherapistService,
        private readonly chatService: ChatService
  ) {}

  @Get('me')
  @UseGuards(TherapistJwtAuthGuard)
  @ApiFindOneQueryParams()
  async getMe(
  @Query() queryParams,
  @CurrentUser() user: TokenPayload,
  ) {
    return await this.therapistService.findOne(user.id,queryParams);
  }


    @ApiFindAllQueryParams()
    @Get('me/chats')
    @UseGuards(TherapistJwtAuthGuard)
    async findMyChats(
      @CurrentUser() _: TokenPayload,
      @AuthEnforcedQueryParams(FindAllQueryParams) queryParams,
    ) {
      return this.chatService.findAll(queryParams);
    }
  
    @ApiFindOneQueryParams()
    @Get('me/chats/:id')
    @UseGuards(TherapistJwtAuthGuard)
    async findOneChat(
      @CurrentUser() _: TokenPayload,
      @AuthEnforcedQueryParams(FindOneQueryParams) queryParams,
      @Param('id') id: string
    ) {
      return this.chatService.findOne(id, queryParams);
    }
  
  
  @Get()
  @DynamicGuards(
new AdminJwtAuthGuard()  
  )
  @ApiFindAllQueryParams()
  findAll(
    @Query() queryparams?: FindAllQueryParams
  ) {
    return this.therapistService.findAll(queryparams);
  }

  @Get(':id')
  @ApiFindOneQueryParams()
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  findOne(
    @Query() queryParams,
    @Param('id') id: string) {
    return this.therapistService.findOne(id, queryParams);
  }

  @Patch('me')
  @DynamicGuards(
  new TherapistJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateTherapistDto: UpdateTherapistDto ) {
    return this.therapistService.update(user.id, updateTherapistDto);
  }

  @Patch(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateTherapistDto: UpdateTherapistDto) {
    return this.therapistService.update(id, updateTherapistDto);
  }

  @Delete(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.therapistService.remove(id);
  }
}
