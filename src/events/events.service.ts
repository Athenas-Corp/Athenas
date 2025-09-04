import { Injectable, Logger } from '@nestjs/common';
import { HandleWhatsAppClient } from '../handle-whata-app-client/handle-whata-app-client.service';
import { Client, Message } from 'whatsapp-web.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly handleWhatsAppClient: HandleWhatsAppClient) {}

  async registerClientEvents(
    client: Client,
    clientName: string,
  ): Promise<void> {
    // Evento disparado quando a sessão é autenticada com sucesso
    client.on('authenticated', () => {
      this.logger.log(`Cliente ${clientName} autenticado com sucesso!`);
    });

    // Evento disparado quando o client está pronto para uso
    client.on('ready', () => {
      void this.handleWhatsAppClient.handleReady(client, clientName);
      this.logger.log(`Evento 'ready' recebido para ${clientName}`);
    });

    // Evento disparado quando há nova mensagem criada
    client.on('message_create', (message: Message) => {
      this.logger.log(`Mensagem recebida de ${message.from}: ${message.body}`);
    });

    // Evento disparado quando é gerado um QR code
    client.on('qr', (qr: string) => {
      this.handleWhatsAppClient.handleQr(qr);
      this.logger.log(`QR code gerado para ${clientName}: ${qr}`);
    });

    // Evento disparado quando a sessão é desconectada
    client.on('disconnected', (reason: string) => {
      this.logger.warn(`Cliente ${clientName} desconectado: ${reason}`);
    });

    // Evento disparado quando há falha na autenticação
    client.on('auth_failure', (msg) => {
      this.logger.error(`Falha na autenticação do ${clientName}: ${msg}`);
    });

    // Evento disparado quando o estado do client muda (ex: CONNECTED, OPENING, UNPAIRED)
    client.on('change_state', (state) => {
      this.logger.log(`Estado do client ${clientName} mudou: ${state}`);
    });

    // Inicializa o client
    await client.initialize();
  }
}
