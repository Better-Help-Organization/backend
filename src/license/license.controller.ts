import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LicenseService } from './license.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { AdminJwtAuthGuard, ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Post()
  @UseGuards(TherapistJwtAuthGuard)
  create(@CurrentUser() token: TokenPayload, @Body() createLicenseDto: CreateLicenseDto) {
    return this.licenseService.create(token, createLicenseDto);
  }

  @Get()
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findAll() {
    return this.licenseService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
    new TherapistJwtAuthGuard(),
    new ClientJwtAuthGuard(),
    new AdminJwtAuthGuard()
  )
  findOne(@Param('id') id: string) {
    return this.licenseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TherapistJwtAuthGuard)
  update(@CurrentUser() token: TokenPayload, @Param('id') id: string, @Body() updateLicenseDto: UpdateLicenseDto) {
    return this.licenseService.update(token, id, updateLicenseDto);
  }

  @Delete(':id')
  @UseGuards(TherapistJwtAuthGuard)
  remove(@CurrentUser() token: TokenPayload, @Param('id') id: string) {
    return this.licenseService.remove(token, id);
  }
}
