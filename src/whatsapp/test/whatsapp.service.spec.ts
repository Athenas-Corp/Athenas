import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../services/whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventsService } from '../../events/events.service';
import { SocketGateway } from '../../socket/socket.gateway';

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
  })),
  LocalAuth: jest.fn(),
}));

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  const mockSessionModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  };

  const mockRedisService = {
    deleteSession: jest.fn(),
    getSession: jest.fn(),
    getSessionTTL: jest.fn(),
    isSessionActive: jest.fn(),
  };

  const mockEventsService = {
    registerClientEvents: jest.fn(),
  };

  const mockSocketGateway = {};

  beforeEach(async () => {
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
    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // helper para simular query com exec()
  function mockExec<T>(value: T): { exec: jest.Mock<Promise<T>, []> } {
    return {
      exec: jest.fn<Promise<T>, []>().mockResolvedValue(value),
    };
  }

  describe('createClient', () => {
    it('deve criar um novo client se não existir', async () => {
      mockSessionModel.findOne.mockReturnValue(mockExec(null));
      mockSessionModel.create.mockResolvedValue({
        clientName: 'teste',
        status: 'pending',
      });

      const result = await service.createClient('teste');

      expect(mockSessionModel.create).toHaveBeenCalledWith({
        clientName: 'teste',
        status: 'pending',
      });
      expect(result).toEqual({ clientName: 'teste', status: 'pending' });
    });

    it('deve lançar erro se client já existir', async () => {
      mockSessionModel.findOne.mockReturnValue(
        mockExec({ clientName: 'teste' }),
      );

      await expect(service.createClient('teste')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('connectClient', () => {
    it('deve conectar cliente existente', async () => {
      mockSessionModel.findOne.mockReturnValue(
        mockExec({ clientName: 'teste' }),
      );

      await service.connectClient('teste');

      expect(mockEventsService.registerClientEvents).toHaveBeenCalled();
    });

    it('deve lançar erro se client não existir', async () => {
      mockSessionModel.findOne.mockReturnValue(mockExec(null));

      await expect(service.connectClient('teste')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteSession', () => {
    it('deve deletar client existente', async () => {
      // findOne com exec()
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ clientName: 'teste' }),
      });

      // deleteOne retorna resultado direto
      mockSessionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteSession('teste');

      expect(mockRedisService.deleteSession).toHaveBeenCalledWith('teste');
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('deve lançar erro se client não existir', async () => {
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteSession('teste')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateClientName', () => {
    it('deve atualizar nome do cliente', async () => {
      mockRedisService.isSessionActive.mockResolvedValue(false);
      mockSessionModel.findOneAndUpdate.mockReturnValue(
        mockExec({ clientName: 'novoNome' }),
      );

      const result = await service.updateClientName('antigoNome', 'novoNome');

      expect(result).toEqual({ status: 'updated', clientName: 'novoNome' });
    });

    it('não deve atualizar se cliente estiver ativo', async () => {
      mockRedisService.isSessionActive.mockResolvedValue(true);

      const result = await service.updateClientName('antigoNome', 'novoNome');

      expect(result).toEqual({
        status: 'error',
        error: 'Não é possível renomear um cliente ativo. Desconecte primeiro.',
      });
    });
  });

  describe('getClientStatus', () => {
    it('deve retornar status do cliente', async () => {
      mockSessionModel.findOne.mockReturnValue(mockExec({ status: 'pending' }));
      mockRedisService.getSession.mockResolvedValue({ status: 'connected' });
      mockRedisService.getSessionTTL.mockResolvedValue(120);

      const result = await service.getClientStatus('teste');

      expect(result).toEqual({
        database: 'pending',
        redis: 'connected',
        ttl: 120,
        isActive: true,
      });
    });
  });
});
