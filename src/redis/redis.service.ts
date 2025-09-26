import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface WhatsAppClientState {
  clientName: string;
  status:
    | 'initializing'
    | 'qr_pending'
    | 'connected'
    | 'disconnected'
    | 'error';
  lastActivity: string;
  connectionAttempts: number;
  clientInfo?: {
    wid?: string;
    platform?: string;
  };
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private readonly SESSION_TTL = 8 * 60 * 60; // 8 horas em segundos
  private readonly KEY_PREFIX = 'whatsapp:session:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.logger.log('Conectado ao Redis');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Erro no Redis:', err);
    });
  }

  private getSessionKey(clientName: string): string {
    return `${this.KEY_PREFIX}${clientName}`;
  }

  async saveSession(
    clientName: string,
    state: WhatsAppClientState,
  ): Promise<void> {
    const key = this.getSessionKey(clientName);
    const data = JSON.stringify(state);

    await this.redis.setex(key, this.SESSION_TTL, data);
    this.logger.debug(`Sessão salva no Redis: ${clientName}`);
  }

  async getSession(clientName: string): Promise<WhatsAppClientState | null> {
    const key = this.getSessionKey(clientName);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as WhatsAppClientState;
    } catch (error) {
      this.logger.error(
        `Erro ao parsear sessão do Redis: ${clientName}`,
        error,
      );
      return null;
    }
  }

  async updateSessionStatus(
    clientName: string,
    status: WhatsAppClientState['status'],
    clientInfo?: WhatsAppClientState['clientInfo'],
  ): Promise<void> {
    const existingSession = await this.getSession(clientName);

    if (existingSession) {
      existingSession.status = status;
      existingSession.lastActivity = new Date().toISOString();

      if (clientInfo) {
        existingSession.clientInfo = clientInfo;
      }

      await this.saveSession(clientName, existingSession);
    }
  }

  async deleteSession(clientName: string): Promise<void> {
    const key = this.getSessionKey(clientName);
    await this.redis.del(key);
    this.logger.debug(`Sessão removida do Redis: ${clientName}`);
  }

  async getAllActiveSessions(): Promise<WhatsAppClientState[]> {
    const pattern = `${this.KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return [];
    }

    const sessions = await this.redis.mget(...keys);
    const activeSessions: WhatsAppClientState[] = [];

    sessions.forEach((sessionData) => {
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData) as WhatsAppClientState;
          activeSessions.push(session);
        } catch (error) {
          this.logger.error('Erro ao parsear sessão:', error);
        }
      }
    });

    return activeSessions;
  }

  async extendSessionTTL(clientName: string): Promise<void> {
    const key = this.getSessionKey(clientName);
    await this.redis.expire(key, this.SESSION_TTL);
  }

  async isSessionActive(clientName: string): Promise<boolean> {
    const key = this.getSessionKey(clientName);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async getSessionTTL(clientName: string): Promise<number> {
    const key = this.getSessionKey(clientName);
    return await this.redis.ttl(key);
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Conexão Redis encerrada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao encerrar conexão Redis:', error);
    }
  }

  async getQrAttempts(clientName: string): Promise<number> {
    const key = `whatsapp:qr_attempts:${clientName}`;
    const attempts = await this.redis.get(key);
    return parseInt(attempts || '0', 10);
  }

  async incrementQrAttempts(
    clientName: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `whatsapp:qr_attempts:${clientName}`;
    await this.redis.incr(key);
    await this.redis.expire(key, ttlSeconds);
  }

  async resetQrAttempts(clientName: string): Promise<void> {
    const key = `whatsapp:qr_attempts:${clientName}`;
    await this.redis.del(key);
  }
}
