import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {

  constructor(private readonly configService: ConfigService){}

  private readonly logger = new Logger(LivekitService.name);
  private apiKey = this.configService.getOrThrow<string>('LIVEKIT_API_Key');
  private apiSecret = this.configService.getOrThrow<string>('LIVEKIT_API_SECRET');
  private livekitHost = this.configService.getOrThrow<string>('LIVEKIT_URL');

  private roomService = new RoomServiceClient(
    this.livekitHost,
    this.apiKey,
    this.apiSecret,
  );

  // ensure room exists
  async ensureRoom(roomName: string, maxParticipants = 50) {
    try {
      await this.roomService.createRoom({
        name: roomName,
        maxParticipants,
        emptyTimeout: 300,
      });

      this.logger.log(`✅ Room created: ${roomName}`);
    } catch (err) {
      this.logger.warn(
        `Room ${roomName} may already exist → ${err.message}`,
      );
    }
  }

  // create token
  async createToken(identity: string, roomName = 'quickstart-room') {
    await this.ensureRoom(roomName, 50);

    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: '30m',
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return token.toJwt();
  }
}
