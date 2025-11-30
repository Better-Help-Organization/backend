import { Controller, Get } from '@nestjs/common';
import { LivekitService } from './livekit.service';

@Controller('livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Get('token')
  async getToken() {
    return this.livekitService.createToken('quickstart-username');
  }

  @Get('token2')
  async getToken2() {
    return this.livekitService.createToken('meme-username');
  }

  @Get('token3')
  async getToken3() {
    return this.livekitService.createToken('xo-meme-username');
  }

  @Get('token4')
  async getToken4() {
    return this.livekitService.createToken('yoyoyooy-meme-username');
  }
}
