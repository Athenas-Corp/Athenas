import { Injectable, Logger } from '@nestjs/common';
import { Client, Message } from 'whatsapp-web.js';
import { generate } from 'terminal-qr';

@Injectable()
export class WhatsAppEventHandler {
  private readonly logger = new Logger(WhatsAppEventHandler.name);

  registerEvents(
    client: Client,
    sessionId: string,
    onDisconnect: () => void,
  ): void {
    client.on('qr', (qr: string) => {
      this.logger.log(`Escaneie o QR Code da sessão "${sessionId}":`);
      generate(qr, { small: true });
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
      onDisconnect();
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
  }
}
