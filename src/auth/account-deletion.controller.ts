import {
    Controller,
    Delete,
    UseGuards
} from '@nestjs/common';
import { TokenPayload } from 'src/common/constants';
import { CurrentUser } from 'src/common/decorators/get-user-decorator';
import { ClientJwtAuthGuard, TherapistJwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { AccountDeletionService } from './account-deletion.service';

@Controller('account')
export class AccountDeletionController {
  constructor(
    private readonly deletionService: AccountDeletionService,
  ) {}

  @UseGuards(ClientJwtAuthGuard)
  @Delete('client')
  async deleteClient(
    @CurrentUser() user: TokenPayload,
    ) {
    await this.deletionService.deleteClient(user.id);
    return {
      message: 'Account deleted successfully',
    };
  }

  @UseGuards(TherapistJwtAuthGuard)
  @Delete('therapist')
  async deleteTherapist(
    @CurrentUser() user: TokenPayload,
  ) {
    await this.deletionService.deleteTherapist(user.id);
    return {
      message: 'Account deleted successfully',
    };
  }
}