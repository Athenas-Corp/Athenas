import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service';

jest.mock('ioredis');

// Interface mínima para mock do Redis
interface RedisMock {
  setex: (key: string, ttl: number, value: string) => Promise<string>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  mget: (keys: string[]) => Promise<string[]>;
  exists: (key: string) => Promise<number>;
  ttl: (key: string) => Promise<number>;
  expire: (key: string, ttl: number) => Promise<number>;
  quit: () => Promise<string>;
}

describe('RedisService', () => {
  let service: RedisService;
  let redisMock: RedisMock;

  const clientName = 'test-client';
  const session = {
    clientName,
    status: 'connected' as const,
    lastActivity: new Date().toISOString(),
    connectionAttempts: 1,
    clientInfo: { wid: '123', platform: 'web' },
  };

  // Mock base reutilizável
  const redisMockBase: RedisMock = {
    setex: jest.fn(() => Promise.resolve('OK')),
    get: jest.fn(() => Promise.resolve(JSON.stringify(session))),
    del: jest.fn(() => Promise.resolve(1)),
    keys: jest.fn(() => Promise.resolve([`whatsapp:session:${clientName}`])),
    mget: jest.fn(() => Promise.resolve([JSON.stringify(session)])),
    exists: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(3600)),
    expire: jest.fn(() => Promise.resolve(1)),
    quit: jest.fn(() => Promise.resolve('OK')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);

    // Reutiliza o mock base e mantém referência em redisMock
    redisMock = { ...redisMockBase };
    (service as unknown as { redis: RedisMock }).redis = redisMock;
  });

  it('should save and get session', async () => {
    await service.saveSession(clientName, session);
    expect(redisMock.setex).toHaveBeenCalledWith(
      `whatsapp:session:${clientName}`,
      28800,
      JSON.stringify(session),
    );

    const result = await service.getSession(clientName);
    expect(result).toEqual(session);
  });

  it('should delete session', async () => {
    await service.deleteSession(clientName);
    expect(redisMock.del).toHaveBeenCalledWith(
      `whatsapp:session:${clientName}`,
    );
  });

  it('should get all active sessions', async () => {
    const sessions = await service.getAllActiveSessions();
    expect(sessions).toEqual([session]);
  });

  it('should extend session TTL', async () => {
    await service.extendSessionTTL(clientName);
    expect(redisMock.expire).toHaveBeenCalledWith(
      `whatsapp:session:${clientName}`,
      28800,
    );
  });

  it('should check if session is active', async () => {
    const isActive = await service.isSessionActive(clientName);
    expect(isActive).toBe(true);
  });

  it('should get session TTL', async () => {
    const ttl = await service.getSessionTTL(clientName);
    expect(ttl).toBe(3600);
  });

  it('should update session status', async () => {
    await service.updateSessionStatus(clientName, 'disconnected');
    expect(redisMock.setex).toHaveBeenCalledWith(
      `whatsapp:session:${clientName}`,
      28800,
      expect.stringContaining('"status":"disconnected"'),
    );
  });

  it('should properly close Redis connection', async () => {
    await service.onModuleDestroy();
    expect(redisMock.quit).toHaveBeenCalled();
  });
});
