import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ClientService } from 'src/client/client.service';
import { UserTypes } from 'src/common/constants';
import { TherapistService } from 'src/therapist/therapist.service';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    // private readonly clientService: ClientService,
    // private readonly therapistService: TherapistService
    @Inject(forwardRef(() => ClientService))
    private readonly clientService: ClientService,

    @Inject(forwardRef(() => TherapistService))
    private readonly therapistService: TherapistService,

  ){}
  // WebSocket server will be injected by the gateway later
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  private async _markOnline(userId: string, userType: UserTypes) {
    if (userType === UserTypes.CLIENT) {
      await this.clientService.setOnline(userId);
    } else if (userType === UserTypes.THERAPIST) {
      await this.therapistService.setOnline(userId);
    } else {
      this.logger.warn(`Unsupported user type "${userType}" when marking online`);
    }
  }

  private async _markOffline(userId: string, userType: UserTypes) {
    if (userType === UserTypes.CLIENT) {
      await this.clientService.setOffline(userId);
    } else if (userType === UserTypes.THERAPIST) {
      await this.therapistService.setOffline(userId);
    } else {
      this.logger.warn(`Unsupported user type "${userType}" when marking offline`);
    }
  }
  async markOnline(userId: string, userType: UserTypes) {
    // add database or cache updates here
    this.logger.log(`Marking ${userType} ${userId} online`);
    this._markOnline(userId,userType)
    this.server?.emit('userStatus', {
      userId,
      type: userType,
      isOnline: true,
    });
  }

  async markOffline(userId: string, userType: UserTypes) {
    this.logger.log(`Marking ${userType} ${userId} offline`);
    this._markOffline(userId,userType)
    this.server?.emit('userStatus', {
      userId,
      type: userType,
      isOnline: false,
    });
  }

  async notifyProfilePictureChange(userId: string, userType: UserTypes, profilePicture: string | null) {
    this.logger.log(`Notifying profile picture change for ${userType} ${userId}`);
    this.server?.emit('userProfileUpdated', { userId, type: userType, profilePicture });
  }
}
