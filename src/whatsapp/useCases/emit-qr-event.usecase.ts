import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class EmiteQrEventUseCase {
  private readonly logger = new Logger(EmiteQrEventUseCase.name);
  private readonly MAX_QR_ATTEMPTS = 3;
  private readonly QR_ATTEMPTS_TTL = 300; // 5 minutos em segundos

  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Retorna true se o cliente deve ser destruído após limite de tentativas
   */
  async execute(qr: string, clientName: string): Promise<boolean> {
    const currentAttempts = await this.redisService.getQrAttempts(clientName);

    if (currentAttempts >= this.MAX_QR_ATTEMPTS) {
      this.logger.warn(
        `Limite de tentativas QR excedido para ${clientName}. Tentativas: ${currentAttempts}`,
      );

      // Reset das tentativas
      await this.redisService.resetQrAttempts(clientName);

      // Indica para o serviço que o cliente deve ser destruído
      return true;
    }

    // Incrementa o contador de tentativas
    await this.redisService.incrementQrAttempts(
      clientName,
      this.QR_ATTEMPTS_TTL,
    );

    // Emite o QR Code via WebSocket
    this.socketGateway.emit('qr-code', { qr, clientName });
    this.logger.log(
      `QR Code emitido para ${clientName}. Tentativa: ${currentAttempts + 1}/${this.MAX_QR_ATTEMPTS}`,
    );

    return false; // Cliente ainda pode continuar
  }

  async resetAttempts(clientName: string): Promise<void> {
    await this.redisService.resetQrAttempts(clientName);
    this.logger.log(`Tentativas QR resetadas para ${clientName}`);
  }
}
