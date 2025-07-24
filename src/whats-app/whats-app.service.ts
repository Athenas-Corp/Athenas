/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { generate } from 'qrcode-terminal';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private clients: Map<string, Client> = new Map();

  async startSession(sessionId: string): Promise<void> {
    if (this.clients.has(sessionId)) {
      this.logger.warn(`Sessão "${sessionId}" já está ativa.`);
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
      puppeteer: { headless: true },
    });

    client.on('qr', (qr: string) => {
      this.logger.log(`Escaneie o QR Code da sessão "${sessionId}":`);
      generate(qr, { small: true }); // Use a função importada diretamente
    });

    client.on('ready', () => {
      this.logger.log(`Sessão "${sessionId}" conectada com sucesso.`);
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(
        `Falha na autenticação da sessão "${sessionId}": ${msg}`,
      );
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(`Sessão "${sessionId}" foi desconectada: ${reason}`);
      this.clients.delete(sessionId);
    });

    client.on(
      'message',
      (message: Message & { _data: { notifyName: string } }) => {
        if (message.body !== '!ping') {
          this.logger.log(`[${sessionId}] Mensagem recebida: ${message.body}`);
          void message.reply(`fala ai mano ${message._data.notifyName}`);
        }
      },
    );

    try {
      await client.initialize();
      this.clients.set(sessionId, client);
    } catch (error) {
      this.logger.error(`Erro ao inicializar sessão "${sessionId}":`, error);
    }
  }

  listSessions(): string[] {
    return Array.from(this.clients.keys());
  }
}
