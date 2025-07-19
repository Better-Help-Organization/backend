import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TherapistService } from './therapist.service';
import { UpdateTherapistDto } from './dto/update-therapist.dto';
import { DynamicGuards } from 'src/common/decorators/dynamic-guard.decorator';
import { AdminJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { TokenPayload } from 'src/common/constants';

@Controller('therapist')
export class TherapistController {
  constructor(private readonly therapistService: TherapistService) {}

  @Get()
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  findAll() {
    return this.therapistService.findAll();
  }

  @Get(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
)
  findOne(@Param('id') id: string) {
    return this.therapistService.findOne(id);
  }

  @Patch(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
  )
  update(@Param('id') id: string, @Body() updateTherapistDto: UpdateTherapistDto) {
    return this.therapistService.update(id, updateTherapistDto);
  }

  @Patch('me')
  @DynamicGuards(
      new TherapistJwtAuthGuard()
  )
  updateMe( @CurrentUser() user: TokenPayload, @Body() updateTherapistDto: UpdateTherapistDto ) {
    return this.therapistService.update(user.id, updateTherapistDto);
  }

  @Delete(':id')
  @DynamicGuards(
new AdminJwtAuthGuard()
)
  remove(@Param('id') id: string) {
    return this.therapistService.remove(id);
  }
}
