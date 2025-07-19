import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClientService } from './client.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, ClientJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { TokenPayload } from 'src/common/constants';

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @DynamicGuards(
    new AdminJwtAuthGuard()
    )
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  @Patch(':id')
  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientService.update(id, updateClientDto);
  }

  @Patch('me')
    @DynamicGuards(
      new ClientJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateClientDto: UpdateClientDto ) {
    return this.clientService.update(user.id, updateClientDto);
  }

  @DynamicGuards(
    new AdminJwtAuthGuard()
  )
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }
}
