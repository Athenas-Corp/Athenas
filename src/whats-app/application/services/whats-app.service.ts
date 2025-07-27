// whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'whatsapp-web.js';
import { WhatsAppClientFactory } from '../../infrastructure/whatsapp-client.factory';
import { WhatsAppEventHandler } from './whatsapp-event-handle.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private clients: Map<string, Client> = new Map();

  constructor(
    private readonly clientFactory: WhatsAppClientFactory,
    private readonly eventHandler: WhatsAppEventHandler,
  ) {}

  async startSession(sessionId: string): Promise<void> {
    if (this.clients.has(sessionId)) {
      this.logger.warn(`Sessão "${sessionId}" já está ativa.`);
      return;
    }

    const client = this.clientFactory.create(sessionId);

    this.eventHandler.registerEvents(client, sessionId, () => {
      this.clients.delete(sessionId);
    });

    try {
      await client.initialize();
      this.clients.set(sessionId, client);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Erro ao inicializar sessão "${sessionId}": ${error.message}`,
        );
      } else {
        this.logger.error(
          `Erro ao inicializar sessão "${sessionId}": ${JSON.stringify(error)}`,
        );
      }
    }
  }

  listSessions(): string[] {
    return Array.from(this.clients.keys());
  }
}
