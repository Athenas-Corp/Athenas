import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { Model, UpdateResult } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { formatPhoneNumber } from '../../../utils/helper/phone.helper';

interface WhatsAppSession {
  sessionId: string;
  status: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sessions = new Map<string, Client>();

  constructor(
    @InjectModel('WhatsAppSession')
    private readonly sessionModel: Model<WhatsAppSession>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Iniciando sessões salvas no banco...');
    const sessions = await this.sessionModel.find({ status: 'ready' }).exec();

    for (const session of sessions) {
      try {
        await this.startSession(session.sessionId, false);
        this.logger.log(`Sessão reconectada: ${session.sessionId}`);
      } catch (error) {
        this.logger.error(
          `Erro ao reconectar sessão ${session.sessionId}:`,
          error,
        );
      }
    }
  }

  async createNewSession(clientName: string): Promise<string> {
    const sessionId = clientName;

    try {
      await this.sessionModel.create({
        sessionId: sessionId,
        status: 'pending',
        clientName,
      });

      await this.startSession(sessionId, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Erro ao criar nova sessão: ${error.message}`);
      } else {
        this.logger.error('Erro desconhecido ao criar nova sessão', error);
      }
    }

    return sessionId;
  }

  async startSession(
    sessionId: string,
    showQrCode = true,
  ): Promise<{ status: string; sessionId: string }> {
    if (this.sessions.has(sessionId)) {
      this.logger.log(`Sessão já existe: ${sessionId}`);
      return { status: 'already-started', sessionId };
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
    });

    this.sessions.set(sessionId, client);

    this.registerClientEvents(client, sessionId, showQrCode);

    try {
      await client.initialize();
      return { status: 'initializing', sessionId };
    } catch (error) {
      this.logUnknownError(error, sessionId, 'Erro geral em startSession');
      return { status: 'error', sessionId };
    }
  }

  private registerClientEvents(
    client: Client,
    sessionId: string,
    showQrCode: boolean,
  ): void {
    if (showQrCode) {
      client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        this.logger.log(`QR Code gerado para sessão: ${sessionId}`);
      });
    }

    client.on('ready', () => {
      this.handleReady(sessionId).catch((err) => {
        this.logger.error(`Erro no handleReady: ${err}`);
      });
    });

    client.on('authenticated', () => {
      this.handleAuthenticated(sessionId);
    });

    client.on('disconnected', (reason) => {
      (async (): Promise<void> => {
        this.logger.warn(`Sessão ${sessionId} desconectada: ${reason}`);
        await this.sessionModel.updateOne(
          { sessionId },
          { status: 'disconnected' },
        );
        this.sessions.delete(sessionId);
      })().catch((err: unknown) => {
        this.logger.error(
          `Erro ao processar desconexão da sessão ${sessionId}`,
          err,
        );
      });
    });

    client.on('message', (message: Message) => {
      this.handleMessage(message, sessionId).catch((err) => {
        this.logger.error(`Erro no handleMessage: ${err}`);
      });
    });
  }

  private async handleReady(sessionId: string): Promise<void> {
    try {
      const result: UpdateResult = await this.sessionModel.updateOne(
        { sessionId },
        { sessionId, status: 'ready' },
        { upsert: true },
      );
      this.logger.log(
        `[${sessionId}] Sessão salva/atualizada no MongoDB - matched: ${result.matchedCount}, modified: ${result.modifiedCount}`,
      );
    } catch (error) {
      this.logUnknownError(
        error,
        sessionId,
        'Erro ao salvar sessão no MongoDB',
      );
    }
  }

  private handleAuthenticated(sessionId: string): void {
    this.logger.log(`[${sessionId}] Cliente autenticado`);
  }

  private async getNotifyName(message: Message): Promise<string> {
    try {
      const contact = await message.getContact();
      return contact.pushname || contact.name || 'meu consagrado';
    } catch {
      return 'meu consagrado';
    }
  }

  private async handleMessage(
    message: Message,
    sessionId: string,
  ): Promise<void> {
    try {
      if (message.body === '!ping') {
        await message.reply('Pong! 🏓');
        this.logger.log(`[${sessionId}] Respondeu ping para ${message.from}`);
        return;
      }

      const notifyName = await this.getNotifyName(message);
      this.logger.log(
        `[${sessionId}] Mensagem recebida de ${notifyName}: ${message.body}`,
      );
      await message.reply(`Estou falando com ${notifyName}?`);
    } catch (error) {
      this.logUnknownError(error, sessionId, 'Erro no listener de mensagem');
    }
  }

  private logUnknownError(
    error: unknown,
    sessionId: string,
    context: string,
  ): void {
    if (error instanceof Error) {
      this.logger.error(
        `[${sessionId}] ${context}: ${error.message}`,
        error.stack,
      );
    } else {
      this.logger.error(`[${sessionId}] ${context}: Erro desconhecido`, error);
    }
  }

  async sendMessage(
    sessionId: string,
    number: string,
    message: string,
  ): Promise<{ status: string; messageId?: string; error?: string }> {
    const client = this.sessions.get(sessionId);

    if (!client) {
      const errMsg = `Sessão ${sessionId} não está ativa.`;
      this.logger.error(errMsg);
      return { status: 'error', error: errMsg };
    }

    const formattedNumber = formatPhoneNumber(number);

    try {
      const messageResponse = await client.sendMessage(
        formattedNumber,
        message,
      );
      return {
        status: 'success',
        messageId: messageResponse.id.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : JSON.stringify(error, Object.getOwnPropertyNames(error));
      this.logger.error(
        `Erro ao enviar mensagem para ${formattedNumber} na sessão ${sessionId}: ${errorMessage}`,
      );
      return { status: 'error', error: errorMessage };
    }
  }
}
