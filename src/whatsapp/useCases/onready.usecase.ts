import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { Client } from 'whatsapp-web.js';

@Injectable()
export class OnReadyUseCase {
  private readonly logger = new Logger(OnReadyUseCase.name);

  constructor(private readonly redisService: RedisService) {}

  async execute(client: Client, clientName: string): Promise<void> {
    this.logger.log(`HandleReadyUseCase iniciado para ${clientName}`);

    await this.redisService.updateSessionStatus(clientName, 'connected', {
      wid: client.info?.wid?.user,
      platform: client.info?.platform,
    });

    this.logger.log(`Cliente ${clientName} conectado e pronto!`);
  }
}
