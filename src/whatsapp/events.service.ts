import { Injectable, Logger } from '@nestjs/common';
import { Client, Message } from 'whatsapp-web.js';
import { EmiteQrEventUseCase } from './useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from './useCases/onready.usecase';
import { RedisService } from '../redis/redis.service';
import { MessageService } from '../message/message.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly emiteQrEventUseCase: EmiteQrEventUseCase,
    private readonly onReadyUseCase: OnReadyUseCase,
    private readonly redisService: RedisService,
    private readonly messageService: MessageService,
  ) {}

  // 🔹 Eventos separados
  onAuthenticated(client: Client, clientName: string): void {
    client.on('authenticated', () => {
      this.logger.log(`Cliente ${clientName} autenticado com sucesso!`);
    });
  }

  onReady(client: Client, clientName: string): void {
    client.on('ready', () => {
      void (async (): Promise<void> => {
        await this.onReadyUseCase.execute(client, clientName);
        this.logger.log(`Evento 'ready' recebido para ${clientName}`);
      })();
    });
  }

  onMessageCreate(client: Client, clientName: string): void {
    client.on('message_create', (message: Message) => {
      this.logger.log(
        `Mensagem recebida do cliente ${clientName} | De: ${message.from} | Conteúdo: ${message.body}`,
      );

      void this.messageService.createMessage({
        from: message.from,
        to: message.to,
        content: message.body,
        status: 'received',
        messageId: message.id._serialized,
      });
    });
  }

  onQr(client: Client, clientName: string): void {
    client.on('qr', (qr: string) => {
      void (async (): Promise<void> => {
        try {
          const shouldDestroyClient = await this.emiteQrEventUseCase.execute(
            qr,
            clientName,
          );

          if (shouldDestroyClient) {
            await this.redisService.deleteSession(clientName);
            await client.destroy();
            this.logger.warn(
              `Cliente ${clientName} destruído após limite de QR Codes.`,
            );
          }
        } catch (error) {
          this.logger.error(`Erro ao processar QR para ${clientName}:`, error);
        }
      })();
    });
  }

  onDisconnected(client: Client, clientName: string): void {
    client.on('disconnected', (reason: string) => {
      this.logger.warn(`Cliente ${clientName} desconectado: ${reason}`);
    });
  }

  onAuthFailure(client: Client, clientName: string): void {
    client.on('auth_failure', (msg: string) => {
      this.logger.error(
        `Falha na autenticação do ${clientName}: ${msg || 'Authentication failed'}`,
      );
    });
  }

  onChangeState(client: Client, clientName: string): void {
    client.on('change_state', (state: string) => {
      this.logger.log(`Estado do client ${clientName} mudou: ${state}`);
    });
  }
}
