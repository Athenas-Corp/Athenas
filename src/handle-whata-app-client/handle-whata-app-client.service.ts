import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { SocketGateway } from '../socket/socket.gateway';
import { IWhatsAppSession } from '../whatsapp/interfaces/whatsapp.interface';
import { Client } from 'whatsapp-web.js';

@Injectable()
export class HandleWhatsAppClient {
  private readonly logger = new Logger(HandleWhatsAppClient.name);

  private activeClients: Map<string, Client> = new Map();

  constructor(
    @InjectModel('WhatsAppSession')
    private readonly sessionModel: Model<IWhatsAppSession>,
    private readonly socketGateway: SocketGateway,
    private readonly redisService: RedisService,
  ) {}

  async handleReady(client: Client, clientName: string): Promise<void> {
    this.logger.log(`Client ${clientName} está pronto!`);

    try {
      await this.sessionModel
        .updateOne({ clientName }, { status: 'connected' })
        .exec();

      await this.redisService.saveSession(clientName, {
        clientName,
        status: 'connected',
        lastActivity: new Date().toISOString(),
        connectionAttempts: 0,
      });

      this.socketGateway.emit('client-ready', { clientName });

      this.activeClients.set(clientName, client);
    } catch (error) {
      this.logger.error(
        `Erro ao processar evento 'ready' para ${clientName}`,
        error,
      );
    }
  }

  getActiveClient(clientName: string): Client | undefined {
    return this.activeClients.get(clientName);
  }

  handleQr(qr: string): void {
    const socketGateway = this.socketGateway.emit('qr-code', { qr: qr });
    this.logger.log('Qr code emitido', qr);
    return socketGateway;
  }
}
