import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { Model, UpdateResult } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { formatPhoneNumber } from '../../../utils/helper/phone.helper';
import {
  defaultHorariosConfig,
  isHorarioComercial,
} from '../../../utils/helper/horario-comercial';

interface WhatsAppSession {
  sessionId: string;
  status: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sessions = new Map<string, Client>();

  private readonly mensagemDentroHorario: string;

  private readonly mensagemForaHorario: string;

  constructor(
    @InjectModel('WhatsAppSession')
    private readonly sessionModel: Model<WhatsAppSession>,
  ) {
    this.mensagemForaHorario =
      'Estamos fora do nosso horário de atendimento. Retornaremos no próximo dia útil.';
    this.mensagemDentroHorario =
      'Recebemos sua mensagem e logo entraremos em contato.';
  }

  async createNewSession(clientName: string): Promise<string> {
    const sessionId = clientName.trim();

    try {
      await this.sessionModel.create({
        sessionId,
        status: 'pending',
        clientName: clientName.trim(),
      });

      this.logger.log(`Sessão criada no banco: ${sessionId}`);
    } catch (error) {
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
    const cleanSessionId = sessionId.trim();

    const sessionExists = await this.sessionModel
      .findOne({ sessionId: cleanSessionId })
      .lean()
      .exec();

    if (!sessionExists) {
      this.logger.warn(`Sessão ${cleanSessionId} não encontrada no banco`);
      const allSessions = await this.sessionModel.find().lean();
      this.logger.debug(
        `Sessões atuais no banco: ${JSON.stringify(allSessions)}`,
      );
      return { status: 'not-found', sessionId: cleanSessionId };
    }

    if (this.sessions.has(cleanSessionId)) {
      this.logger.log(`Sessão já em execução: ${cleanSessionId}`);
      return { status: 'already-started', sessionId: cleanSessionId };
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: cleanSessionId }),
    });

    this.sessions.set(cleanSessionId, client);
    this.registerClientEvents(client, cleanSessionId, showQrCode);

    try {
      await client.initialize();
      await this.sessionModel.updateOne(
        { sessionId: cleanSessionId },
        { $set: { status: 'initializing' } },
      );
      return { status: 'initializing', sessionId: cleanSessionId };
    } catch (error) {
      this.logUnknownError(error, cleanSessionId, 'Erro ao iniciar sessão');
      await this.sessionModel.updateOne(
        { sessionId: cleanSessionId },
        { $set: { status: 'error' } },
      );
      return { status: 'error', sessionId: cleanSessionId };
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

    client.on('message', (message) => {
      void (async (): Promise<void> => {
        try {
          if (message.fromMe) return;

          const from = message.from;
          const number = from.split('@')[0];

          this.logger.log(
            `Mensagem recebida de ${number} na sessão ${sessionId}, enviando resposta automática...`,
          );

          await this.enviarRespostaAutomatica(sessionId, number, message);
        } catch (err) {
          this.logger.error(`Erro ao processar mensagem: ${err}`);
        }
      })();
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
      return contact.pushname || contact.name || 'cliente';
    } catch {
      return 'cliente';
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

  private respondedNumbers: Map<string, Set<string>> = new Map();

  async enviarRespostaAutomatica(
    sessionId: string,
    number: string,
    message: Message,
  ): Promise<{ status: string; error?: string }> {
    if (!this.respondedNumbers.has(sessionId)) {
      this.respondedNumbers.set(sessionId, new Set());
    }
    const numbersForSession = this.respondedNumbers.get(sessionId)!;

    if (numbersForSession.has(number)) {
      this.logger.log(
        `Resposta automática já enviada para ${number}, ignorando...`,
      );
      return { status: 'already-sent' };
    }

    const nomeContato = await this.getNotifyName(message);

    const agora = new Date();
    const mensagemBase = isHorarioComercial(agora, defaultHorariosConfig)
      ? this.mensagemDentroHorario
      : this.mensagemForaHorario;

    const mensagemPersonalizada = `Olá, ${nomeContato}! ${mensagemBase}`;

    try {
      const resultado = await this.sendMessage(
        sessionId,
        number,
        mensagemPersonalizada,
      );

      if (resultado.status === 'success') {
        numbersForSession.add(number);
        this.logger.log(`Mensagem automática enviada para ${number}`);
      } else {
        this.logger.error(`Erro ao enviar mensagem automática para ${number}`);
      }

      return resultado;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Erro inesperado ao enviar mensagem automática: ${error.message}`,
        );
      } else {
        this.logger.error(
          'Erro inesperado ao enviar mensagem automática: erro desconhecido',
        );
      }
      return { status: 'error', error: 'Erro inesperado' };
    }
  }
}
