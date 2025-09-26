import { Controller, Get } from '@nestjs/common';
import { RedisService, WhatsAppClientState } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('active-sessions')
  async algumaCoisaAi(): Promise<WhatsAppClientState[]> {
    return this.redisService.getAllActiveSessions();
  }
}
