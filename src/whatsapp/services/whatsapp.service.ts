import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { DeleteResult, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SocketGateway } from '../../socket/socket.gateway';
import { SessionResponseDto } from '../dto/session-response.dto';
import { IWhatsAppSession } from '../interfaces/whatsapp.interface';
import { RedisService } from '../../redis/redis.service';
import { EventsService } from '../../events/events.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private initializingClients: Map<string, Client> = new Map();
  private activeClients: Map<string, Client> = new Map();

  constructor(
    @InjectModel('WhatsAppSession')

    private readonly sessionModel: Model<IWhatsAppSession>,
    private readonly socketGateway: SocketGateway,
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
  ) {}

  private buildClient(clientName: string): Client {
    return new Client({
      authStrategy: new LocalAuth({
        dataPath: `sessions/${clientName}`,
        clientId: clientName,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
    });
  }

  async findClient(clientName: string): Promise<IWhatsAppSession | null> {
    return this.sessionModel.findOne({ clientName }).exec();
  }

  async findAllSessions(): Promise<SessionResponseDto[]> {
    return this.sessionModel.find().lean().exec();
  }

  async createClient(clientName: string): Promise<IWhatsAppSession> {
    const existClient = await this.findClient(clientName);
    if (existClient) {
      throw new ConflictException('Já existe um client com esse nome');
    }

    return this.sessionModel.create({
      status: 'pending',
      clientName,

    });
  }


  async connectClient(clientName: string): Promise<void> {
    try {
      const existConnection = await this.findClient(clientName);
      if (!existConnection) {
        throw new NotFoundException(
          `Sessão ${clientName} não encontrada. Crie uma nova antes de conectar.`,
        );
      }


      if (this.activeClients.has(clientName)) {
        throw new ConflictException(`Cliente ${clientName} já está conectado`);
      }

      this.logger.log(`Iniciando conexão para ${clientName}`);

      const client = this.buildClient(clientName);

      this.initializingClients.set(clientName, client);

      // 🔑 Registra todos os eventos via EventsService
      await this.eventsService.registerClientEvents(client, clientName);

      this.logger.log(`Cliente ${clientName} em processo de inicialização`);
    } catch (error) {
      this.logger.error(`Erro ao conectar client ${clientName}`, error);

      this.activeClients.delete(clientName);
      this.initializingClients.delete(clientName);

      throw error;
    }

  }

  async deleteSession(clientName: string): Promise<DeleteResult> {
    const existClient = await this.findClient(clientName);
    if (!existClient) {
      throw new NotFoundException(`Client ${clientName} não existe`);
    }

    if (this.initializingClients.has(clientName)) {
      const client = this.initializingClients.get(clientName);
      if (!client) {
        throw new NotFoundException('Client não existe');
      }


      await client.destroy();
      this.initializingClients.delete(clientName);

    }

    if (this.activeClients.has(clientName)) {
      const client = this.activeClients.get(clientName);
      if (client) {
        await client.destroy();
      }
      this.activeClients.delete(clientName);
    }

    await this.redisService.deleteSession(clientName);

    this.logger.log(`Sessão deletada: ${clientName}`);
    return this.sessionModel.deleteOne({ clientName });
  }

  async getClientStatus(clientName: string): Promise<{
    database: string;
    redis: string | null;
    ttl: number;
    isActive: boolean;
  }> {
    const dbSession = await this.findClient(clientName);
    const redisSession = await this.redisService.getSession(clientName);
    const ttl = await this.redisService.getSessionTTL(clientName);

    return {
      database: dbSession?.status || 'not_found',
      redis: redisSession?.status || null,
      ttl,
      isActive: !!redisSession && redisSession.status === 'connected',
    };
  }

  async updateClientName(
    oldClientName: string,
    newClientName: string,
  ): Promise<{ status: string; clientName?: string; error?: string }> {
    const cleanOldName = (oldClientName ?? '').toString();
    const cleanNewName = (newClientName ?? '').toString();

    if (!cleanOldName || !cleanNewName) {
      return { status: 'error', error: 'Nome antigo ou novo inválido' };
    }

    const isActive = await this.redisService.isSessionActive(cleanOldName);
    if (isActive) {
      return {
        status: 'error',
        error: 'Não é possível renomear um cliente ativo. Desconecte primeiro.',
      };
    }

    try {
      const updatedSession = await this.sessionModel
        .findOneAndUpdate(
          { clientName: cleanOldName },
          { $set: { clientName: cleanNewName } },
          { new: true },
        )
        .exec();

      if (!updatedSession) {
        this.logger.warn(
          `Sessão ${cleanOldName} não encontrada para atualização`,
        );
        return { status: 'not_found', error: 'Sessão não encontrada' };

      }
      this.logger.log(`Mensagem automática enviada para ${number}`);

      this.logger.log(`Sessão atualizada: ${cleanOldName} → ${cleanNewName}`);
      return { status: 'updated', clientName: cleanNewName };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao atualizar sessão: ${message}`);
      return { status: 'error', error: message };
    }
  }
}

//Aqui está em caso de perder tudo e refatorar:

// async ClientReady() {
//   const client = new Client({
//     authStrategy: new LocalAuth({
//       clientId: 'client-one',
//       dataPath: './sessions/client-one', // garante pasta limpa para testes
//     }),
//     puppeteer: {
//       headless: true,
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--no-first-run',
//         '--no-zygote',
//         '--single-process',
//         '--disable-gpu',
//       ],
//     },
//   });

//   console.log('Bateu no ClientReady da service!');

//   // Evento QR
//   client.on('qr', (qr) => {
//     console.log('QR code recebido, escaneie com seu WhatsApp!');
//     qrcode.generate(qr, { small: true });
//   });

//   // Evento de autenticação
//   client.on('authenticated', () => {
//     console.log('✅ Cliente autenticado com sucesso!');
//   });

//   // Falha na autenticação
//   client.on('auth_failure', (msg) => {
//     console.error('⚠️ Falha na autenticação:', msg);
//   });

//   // Evento ready
//   client.on('ready', () => {
//     console.log('✅ Client is ready!');
//   });

//   client.once('ready', () => {
//     console.log('✅ Client is finally ready!');
//   });

//   // Inicializa o client
//   await client.initialize();
//   console.log('client.initialize() retornou');
// }
