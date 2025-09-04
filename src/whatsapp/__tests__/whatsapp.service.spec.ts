import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { RedisService } from '../../redis/redis.service';
import { EventsService } from '../../events/events.service';
import { SocketGateway } from '../../socket/socket.gateway';

import { WhatsAppService } from '../whatsapp.service';
import {
  createMockDeleteResult,
  createMockExec,
  createMockSession,
  createMockSessionResponse,
  mockClient,
  mockEventsService,
  mockRedisService,
  mockSessionModel,
  mockSocketGateway,
} from '../__moks__/whatsapp.service.mocks';
import { SessionResponseDto } from '../dto/session-response.dto';
import { Client } from 'whatsapp-web.js';
import { IWhatsAppSession } from '../interfaces/whatsapp.interface';

jest.mock('whatsapp-web.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      on: jest.fn(),
      initialize: jest.fn(),
    })),
    LocalAuth: jest.fn(),
    MessageMedia: jest.fn(),
  };
});

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: getModelToken('WhatsAppSession'),
          useValue: mockSessionModel,
        },
        { provide: RedisService, useValue: mockRedisService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: SocketGateway, useValue: mockSocketGateway },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    jest.spyOn(service['logger'], 'log').mockImplementation((): void => {});
    jest.spyOn(service['logger'], 'error').mockImplementation((): void => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation((): void => {});
  });

  afterEach((): void => {
    jest.clearAllMocks();
    // Limpa os maps internos
    service['activeClients'].clear();
    service['initializingClients'].clear();
  });

  describe('findClient', (): void => {
    it('deve retornar uma sessão existente', async (): Promise<void> => {
      const mockSession = createMockSession({ clientName: 'test-client' });
      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));

      const result = await service.findClient('test-client');

      expect(result).toEqual(mockSession);
      expect(mockSessionModel.findOne).toHaveBeenCalledWith({
        clientName: 'test-client',
      });
    });

    it('deve retornar null se sessão não existir', async (): Promise<void> => {
      mockSessionModel.findOne.mockReturnValue(createMockExec(null));

      const result = await service.findClient('inexistent-client');

      expect(result).toBeNull();
    });

    it('deve retornar todas as sessões', async (): Promise<void> => {
      const mockSessions: SessionResponseDto[] = [
        createMockSessionResponse({
          sessionId: 'session-1',
          clientName: 'client1',
        }),
        createMockSessionResponse({
          sessionId: 'session-2',
          clientName: 'client2',
        }),
      ];

      const mockFindChain = {
        lean: jest.fn().mockReturnValue(createMockExec(mockSessions)),
      };
      mockSessionModel.find.mockReturnValue(mockFindChain);

      const result = await service.findAllSessions();

      expect(result).toEqual(mockSessions);
      expect(mockSessionModel.find).toHaveBeenCalled();
      expect(mockFindChain.lean).toHaveBeenCalled();
    });
  });

  describe('createClient', (): void => {
    it('deve criar um novo cliente com sucesso', async (): Promise<void> => {
      const clientName = 'new-client';
      const mockSession = createMockSession({ clientName });

      mockSessionModel.findOne.mockReturnValue(createMockExec(null));
      mockSessionModel.create.mockResolvedValue(mockSession);

      const result = await service.createClient(clientName);

      expect(result).toEqual(mockSession);
      expect(mockSessionModel.create).toHaveBeenCalledWith({
        status: 'pending',
        clientName,
      });
    });

    it('deve lançar ConflictException se cliente já existir', async (): Promise<void> => {
      const clientName = 'existing-client';
      const existingSession = createMockSession({ clientName });

      mockSessionModel.findOne.mockReturnValue(createMockExec(existingSession));

      await expect(service.createClient(clientName)).rejects.toThrow(
        ConflictException,
      );
      expect(mockSessionModel.create).not.toHaveBeenCalled();
    });
  });

  describe('connectClient', (): void => {
    it('deve conectar cliente com sucesso', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });

      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockEventsService.registerClientEvents.mockResolvedValue(undefined);

      await service.connectClient(clientName);

      expect(mockEventsService.registerClientEvents).toHaveBeenCalled();
      expect(service['initializingClients'].has(clientName)).toBe(true);
    });

    it('deve lançar NotFoundException se sessão não existir', async (): Promise<void> => {
      const clientName = 'inexistent-client';
      mockSessionModel.findOne.mockReturnValue(createMockExec(null));

      await expect(service.connectClient(clientName)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se cliente já estiver ativo', async (): Promise<void> => {
      const clientName = 'active-client';
      const mockSession = createMockSession({ clientName });

      service['activeClients'].set(clientName, mockClient as Client);
      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));

      await expect(service.connectClient(clientName)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve limpar maps e lançar erro se registerClientEvents falhar', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });
      const error = new Error('Falha teste');

      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockEventsService.registerClientEvents.mockRejectedValue(error);

      await expect(service.connectClient(clientName)).rejects.toThrow(error);
      expect(service['activeClients'].has(clientName)).toBe(false);
      expect(service['initializingClients'].has(clientName)).toBe(false);
    });
  });

  describe('deleteSession', (): void => {
    it('deve deletar sessão com sucesso', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });
      const mockDeleteResult = createMockDeleteResult(1);

      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockRedisService.deleteSession.mockResolvedValue(true);
      mockSessionModel.deleteOne.mockResolvedValue(mockDeleteResult);

      const result = await service.deleteSession(clientName);

      expect(result).toEqual(mockDeleteResult);
      expect(mockRedisService.deleteSession).toHaveBeenCalledWith(clientName);
    });

    it('deve lançar NotFoundException se cliente não existir', async (): Promise<void> => {
      const clientName = 'inexistent-client';
      mockSessionModel.findOne.mockReturnValue(createMockExec(null));

      await expect(service.deleteSession(clientName)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve destruir cliente em initializingClients', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });
      const mockDeleteResult = createMockDeleteResult(1);

      service['initializingClients'].set(clientName, mockClient as Client);
      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockRedisService.deleteSession.mockResolvedValue(true);
      mockSessionModel.deleteOne.mockResolvedValue(mockDeleteResult);

      await service.deleteSession(clientName);

      expect(mockClient.destroy).toHaveBeenCalled();
      expect(service['initializingClients'].has(clientName)).toBe(false);
    });

    it('deve lançar NotFoundException se client em initializingClients não existir', async (): Promise<void> => {
      const clientName = 'test-client';

      mockSessionModel.findOne.mockReturnValue(createMockExec(null));

      await expect(service.deleteSession(clientName)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve ignorar client nulo em activeClients sem lançar erro', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });
      const mockDeleteResult = createMockDeleteResult(1);

      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockRedisService.deleteSession.mockResolvedValue(true);
      mockSessionModel.deleteOne.mockResolvedValue(mockDeleteResult);

      const result = await service.deleteSession(clientName);

      expect(result.deletedCount).toBe(1);
      expect(service['activeClients'].has(clientName)).toBe(false);
    });

    it('deve destruir cliente em activeClients', async (): Promise<void> => {
      const clientName = 'test-client';
      const mockSession = createMockSession({ clientName });
      const mockDeleteResult = createMockDeleteResult(1);

      service['activeClients'].set(clientName, mockClient as Client);
      mockSessionModel.findOne.mockReturnValue(createMockExec(mockSession));
      mockRedisService.deleteSession.mockResolvedValue(true);
      mockSessionModel.deleteOne.mockResolvedValue(mockDeleteResult);

      await service.deleteSession(clientName);

      expect(mockClient.destroy).toHaveBeenCalled();
      expect(service['activeClients'].has(clientName)).toBe(false);
    });
  });

  describe('getClientStatus', (): void => {
    it('deve retornar status completo quando sessões existem', async (): Promise<void> => {
      const clientName = 'test-client';
      const dbSession = createMockSession({ clientName, status: 'connected' });
      const redisSession = { status: 'connected' };
      const ttl = 3600;

      mockSessionModel.findOne.mockReturnValue(createMockExec(dbSession));
      mockRedisService.getSession.mockResolvedValue(redisSession);
      mockRedisService.getSessionTTL.mockResolvedValue(ttl);

      const result = await service.getClientStatus(clientName);

      expect(result).toEqual({
        database: 'connected',
        redis: 'connected',
        ttl: 3600,
        isActive: true,
      });
    });

    it('deve retornar valores padrões se dbSession ou redisSession forem nulos', async (): Promise<void> => {
      const clientName = 'test-client';

      mockSessionModel.findOne.mockReturnValue(createMockExec(null));
      mockRedisService.getSession.mockResolvedValue(null);
      mockRedisService.getSessionTTL.mockResolvedValue(0);

      const result = await service.getClientStatus(clientName);

      expect(result).toEqual({
        database: 'not_found',
        redis: null,
        ttl: 0,
        isActive: false,
      });
    });

    it('deve retornar isActive false quando redis status não for connected', async (): Promise<void> => {
      const clientName = 'test-client';
      const dbSession = createMockSession({ clientName, status: 'pending' });
      const redisSession = { status: 'pending' };

      mockSessionModel.findOne.mockReturnValue(createMockExec(dbSession));
      mockRedisService.getSession.mockResolvedValue(redisSession);
      mockRedisService.getSessionTTL.mockResolvedValue(0);

      const result = await service.getClientStatus(clientName);

      expect(result.isActive).toBe(false);
    });
  });

  describe('updateClientName', (): void => {
    it('deve atualizar nome do cliente com sucesso', async (): Promise<void> => {
      const oldName = 'old-client';
      const newName = 'new-client';
      const updatedSession = createMockSession({ clientName: newName });

      mockRedisService.isSessionActive.mockResolvedValue(false);
      mockSessionModel.findOneAndUpdate.mockReturnValue(
        createMockExec(updatedSession),
      );

      const result = await service.updateClientName(oldName, newName);

      expect(result).toEqual({
        status: 'updated',
        clientName: newName,
      });
      expect(mockSessionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { clientName: oldName },
        { $set: { clientName: newName } },
        { new: true },
      );
    });

    it('deve retornar erro se oldClientName for inválido', async (): Promise<void> => {
      const result = await service.updateClientName('', 'novo');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Nome antigo ou novo inválido');
    });

    it('deve retornar erro se newClientName for inválido', async (): Promise<void> => {
      const result = await service.updateClientName('antigo', '');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Nome antigo ou novo inválido');
    });

    it('deve retornar erro se cliente estiver ativo', async (): Promise<void> => {
      const oldName = 'active-client';
      const newName = 'new-name';

      mockRedisService.isSessionActive.mockResolvedValue(true);

      const result = await service.updateClientName(oldName, newName);

      expect(result).toEqual({
        status: 'error',
        error: 'Não é possível renomear um cliente ativo. Desconecte primeiro.',
      });
    });

    it('deve retornar not_found se sessão não for encontrada', async (): Promise<void> => {
      const oldName = 'inexistent-client';
      const newName = 'new-name';

      mockRedisService.isSessionActive.mockResolvedValue(false);
      mockSessionModel.findOneAndUpdate.mockReturnValue(createMockExec(null));

      const result = await service.updateClientName(oldName, newName);

      expect(result.status).toBe('not_found');
      expect(result.error).toBe('Sessão não encontrada');
    });

    it('deve retornar error se ocorrer exceção ao atualizar', async (): Promise<void> => {
      const oldName = 'test-client';
      const newName = 'new-name';
      const error = new Error('Falha teste');

      mockRedisService.isSessionActive.mockResolvedValue(false);
      mockSessionModel.findOneAndUpdate.mockReturnValue({
        exec: jest
          .fn<Promise<IWhatsAppSession | null>, []>()
          .mockRejectedValue(error),
      });

      const result = await service.updateClientName(oldName, newName);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Falha teste');
    });

    it('deve tratar nomes com valores undefined/null', async (): Promise<void> => {
      const result1 = await service.updateClientName(
        undefined as unknown as string,
        'novo',
      );
      const result2 = await service.updateClientName(
        'antigo',
        null as unknown as string,
      );

      expect(result1.status).toBe('error');
      expect(result2.status).toBe('error');
    });
  });
});
