import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFilterByDate, ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreateAdminSubscriptionDto } from './dto/create-admin-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateAdminSubscriptionDto, UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() token: TokenPayload, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(token, dto);
  }

  @ApiFindAllQueryParams()
  @ApiFilterByDate()
  @Get("user-sub")
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  // @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  findAllUsersubs(
    @Query() query: FindAllQueryParams,
  ) {
    return this.subscriptionService.findAllUsersubs(query, query.startDate, query.endDate);
  }

  @Post('admin')
  @UseGuards(AdminJwtAuthGuard)
  createAdmin(@Body() dto: CreateAdminSubscriptionDto) {
    return this.subscriptionService.createAdminSubscription(dto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  ) findAll(@Query() query: FindAllQueryParams) {
    return this.subscriptionService.findAll(query);
  }
  // // findAllUsersubs


  @ApiFindOneQueryParams()
  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  ) findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.subscriptionService.findOne(id, query);
  }

  @Patch('/admin/:id')
  @UseGuards(AdminJwtAuthGuard)
  updateAdminSub(
    @Param('id') id: string,
    @Body() dto: UpdateAdminSubscriptionDto,
  ) {
    return this.subscriptionService.updateSub(id, dto);
  }

  @ApiFindAllQueryParams()
  @Get(':preferenceId')
  @UseGuards(ClientJwtAuthGuard)
  getSubscriptionPackages(@Param('preferenceId') id: string, @Query() query: FindAllQueryParams) {
    return this.subscriptionService.findAvailableSubscriptionsByPreference(id);
  }
  
  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(
    @CurrentUser() token: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(token, id, dto);
  }


  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  ) remove(@Param('id') id: string) {
    return this.subscriptionService.remove(id);
  }
}
