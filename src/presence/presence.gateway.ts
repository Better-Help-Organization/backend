import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { ClientService } from 'src/client/client.service';
import { TokenPayload, UserTypes } from 'src/common/constants';
import { TherapistService } from 'src/therapist/therapist.service';

@WebSocketGateway({ cors: { origin: '*' }})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  /*
    Track active socket IDs per userId. 
    Key: userId (string), Value: Set of socket IDs.
   */
  // TODO: Move to redis
  private readonly activeSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
    private readonly therapistService: TherapistService,
  ) {
  }

  //Safely extract JWT from handshake
  private extractToken(user: Socket): string | undefined {
    const fromAuth = (user.handshake as any).auth?.token as string | undefined;
    return fromAuth;
  }

  async handleConnection(user: Socket) {
    try {
      const token = this.extractToken(user);
      if (!token) {
        this.logger.warn('Missing token in WebSocket handshake; disconnecting user');
        user.disconnect();
        return;
      }

      // Decode token without verifying to get type
      const decoded: any = this.jwtService.decode(token);
      if (!decoded || !decoded.type) {
        this.logger.warn('Token missing type; disconnecting user');
        user.disconnect();
        return;
      }

      // Verify and decode payload
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.authService['_getAccessTokenSecret'](decoded.type), // dynamically pick secret
      });

      const { id: userId, type: userType } = payload;

      if (!userId || !userType) {
        this.logger.warn('Invalid payload (missing id or type); disconnecting user');
        user.disconnect();
        return;
      }

      // Attach metadata to socket
      user.data.userId = String(userId);
      user.data.userType = userType;

      // Track socket -> user
      if (!this.activeSockets.has(user.data.userId)) {
        this.activeSockets.set(user.data.userId, new Set());
      }
      const socketSet = this.activeSockets.get(user.data.userId)!;
      socketSet.add(user.id);

      // If this is the first active connection for this user, mark online and broadcast
      if (socketSet.size === 1) {
        await this.markOnline(user.data.userId, userType);
        this.server.emit('userStatus', {
          userId: user.data.userId,
          type: userType,
          isOnline: true,
        });
      }

      this.logger.log(`${userType} ${user.data.userId} connected (sockets: ${socketSet.size})`);
    } catch (error: any) {
      this.logger.error(`Connection failed: ${error?.message ?? error}`);
      user.disconnect();
    }
  }

  async handleDisconnect(user: Socket) {
    const userId = user.data?.userId as string | undefined;
    const userType = user.data?.userType as UserTypes | undefined;

    if (!userId || !userType) {
      // Nothing to do if we never associated this socket with a user
      return;
    }

    const socketSet = this.activeSockets.get(userId);
    if (socketSet) {
      socketSet.delete(user.id);

      if (socketSet.size === 0) {
        // Last socket closed → mark offline and notify
        this.activeSockets.delete(userId);
        await this.markOffline(userId, userType);
        this.server.emit('userStatus', { userId, type: userType, isOnline: false });
        this.logger.log(`${userType} ${userId} disconnected (last socket)`);
      } else {
        this.logger.log(`${userType} ${userId} disconnected (remaining sockets: ${socketSet.size})`);
      }
    }
  }

  private async markOnline(userId: string, userType: UserTypes) {
    if (userType === UserTypes.CLIENT) {
      await this.clientService.setOnline(userId);
    } else if (userType === UserTypes.THERAPIST) {
      await this.therapistService.setOnline(userId);
    } else {
      this.logger.warn(`Unsupported user type "${userType}" when marking online`);
    }
  }

  private async markOffline(userId: string, userType: UserTypes) {
    if (userType === UserTypes.CLIENT) {
      await this.clientService.setOffline(userId);
    } else if (userType === UserTypes.THERAPIST) {
      await this.therapistService.setOffline(userId);
    } else {
      this.logger.warn(`Unsupported user type "${userType}" when marking offline`);
    }
  }

  async notifyProfilePictureChange(userId: string, userType: UserTypes, profilePicture: string | null) {
    this.server.emit('userProfileUpdated', {
        userId,
        type: userType,
        profilePicture,
      });
    }

}
