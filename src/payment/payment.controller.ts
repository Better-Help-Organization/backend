import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ApiFindAllQueryParams, ApiFindOneQueryParams, FindAllQueryParams, FindOneQueryParams } from 'src/common/middlewares/api-features.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(ClientJwtAuthGuard)
  create(@CurrentUser() token: TokenPayload, @Body() dto: CreatePaymentDto) {
    return this.paymentService.create(token, dto);
  }

  @ApiFindAllQueryParams()
  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  findAll(@Query() query: FindAllQueryParams) {
    return this.paymentService.findAll(query);
  }

  @ApiFindOneQueryParams()
  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  findOne(@Param('id') id: string, @Query() query: FindOneQueryParams) {
    return this.paymentService.findOne(id, query);
  }

  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard)
  update(
    @CurrentUser() token: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto
  ) {
    return this.paymentService.update(token, id, dto);
  }

  @Delete('softDelete/:id')
  @UseGuards(AdminJwtAuthGuard)
  softRemove(@Param('id') id: string) {
    return this.paymentService.softRemove(id);
  }

  @Delete(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard(),
    new ClientJwtAuthGuard()
  )
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }
}
