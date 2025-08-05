import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { Model, UpdateResult } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

interface WhatsAppSession {
  sessionId: string;
  status: string;
}

// Extensão segura para acessar notifyName sem usar any
interface MessageWithNotifyName extends Message {
  _data?: {
    notifyName?: string;
  };
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
        await this.startSession(session.sessionId);
        this.logger.log(`Sessão reconectada: ${session.sessionId}`);
      } catch (error) {
        this.logger.error(
          `Erro ao reconectar sessão ${session.sessionId}:`,
          error,
        );
      }
    }
  }

  async startSession(
    sessionId: string,
  ): Promise<{ status: string; sessionId: string }> {
    try {
      if (this.sessions.has(sessionId)) {
        this.logger.log(`Sessão já existe: ${sessionId}`);
        return { status: 'already-started', sessionId };
      }

      const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId }),
      });

      this.sessions.set(sessionId, client);

      try {
        this.registerClientEvents(client, sessionId);
      } catch (error: unknown) {
        this.logUnknownError(
          error,
          sessionId,
          'Erro ao registrar eventos do client',
        );
        return { status: 'error', sessionId };
      }

      await client.initialize();

      return { status: 'initializing', sessionId };
    } catch (error: unknown) {
      this.logUnknownError(error, sessionId, 'Erro geral em startSession');
      return { status: 'error', sessionId };
    }
  }

  private registerClientEvents(client: Client, sessionId: string): void {
    try {
      client.on('qr', (qr: string) => this.handleQr(qr, sessionId));

      client.on('ready', () => {
        void this.handleReady(sessionId).catch((error) =>
          this.logUnknownError(error, sessionId, 'Erro no evento ready'),
        );
      });

      client.on('authenticated', () => this.handleAuthenticated(sessionId));

      client.on('message', (message: Message) => {
        void this.handleMessage(message, sessionId).catch((error) =>
          this.logUnknownError(error, sessionId, 'Erro no evento message'),
        );
      });
    } catch (error: unknown) {
      this.logUnknownError(error, sessionId, 'Erro ao registrar eventos');
      throw error;
    }
  }

  private handleQr(qr: string, sessionId: string): void {
    try {
      this.logger.log(
        `[${sessionId}] QR code recebido: ${qr.substring(0, 30)}...`,
      );
      qrcode.generate(qr, { small: true });
    } catch (error: unknown) {
      this.logUnknownError(error, sessionId, 'Erro ao gerar QR code');
    }
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
    } catch (error: unknown) {
      this.logUnknownError(
        error,
        sessionId,
        'Erro ao salvar sessão no MongoDB',
      );
    }
  }

  private handleAuthenticated(sessionId: string): void {
    try {
      this.logger.log(`[${sessionId}] Cliente autenticado`);
    } catch (error: unknown) {
      this.logUnknownError(error, sessionId, 'Erro no evento authenticated');
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
      } else {
        const notifyName =
          (message as MessageWithNotifyName)?._data?.notifyName ??
          'meu consagrado';
        this.logger.log(`[${sessionId}] Mensagem recebida: ${message.body}`);
        await message.reply(`fala ai mano ${notifyName}`);
      }
    } catch (error: unknown) {
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
}
