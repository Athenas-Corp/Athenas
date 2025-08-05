import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { Client } from 'whatsapp-web.js';
import { WhatsAppSession } from '../interfaces/session.interface';

jest.mock('whatsapp-web.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      on: jest.fn(),
    })),
    LocalAuth: jest.fn(),
    Message: jest.fn(),
  };
});

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  const mockUpdateOne = jest.fn();
  const mockFind = jest.fn();

  const mockSessionModel = {
    updateOne: mockUpdateOne,
    find: mockFind,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: getModelToken('WhatsAppSession'),
          useValue: mockSessionModel,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('deve iniciar uma nova sessão se não existir.', async () => {
      const sessionId = 'session-1';

      const initializeMock = jest.fn();
      const onMock = jest.fn();

      (Client as unknown as jest.Mock).mockImplementation(() => ({
        initialize: initializeMock,
        on: onMock,
      }));

      const result = await service.startSession(sessionId);

      expect(result).toEqual({ status: 'initializing', sessionId });
      expect(Client).toHaveBeenCalled();
      expect(onMock).toHaveBeenCalled(); // eventos foram registrados
      expect(initializeMock).toHaveBeenCalled();
    });

    it('deve retornar "already-started" se a sessão já estiver em memória', async () => {
      const sessionId = 'existing-session';
      service['sessions'].set(sessionId, {} as Client);

      const result = await service.startSession(sessionId);

      expect(result).toEqual({ status: 'already-started', sessionId });
    });

    it('deve retornar erro ao falhar na criação da sessão', async () => {
      const sessionId = 'fail-session';

      (Client as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('erro simulado');
      });

      const result = await service.startSession(sessionId);

      expect(result).toEqual({ status: 'error', sessionId });
    });
  });

  describe('onModuleInit', () => {
    it('deve iniciar sessões salvas no banco', async () => {
      const sessionId = 'saved-session';

      const sessionData: WhatsAppSession[] = [
        {
          sessionId,
          status: 'ready',
          sessionData: {
            WABrowserId: 'mock-browser-id',
            WASecretBundle: {
              keyData: 'mock-key-data',
            },
            WAToken1: 'mock-token-1',
            WAToken2: 'mock-token-2',
          },
        },
      ];

      mockFind.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sessionData),
      });

      const startSessionSpy = jest
        .spyOn(service, 'startSession')
        .mockImplementation((sessionId: string) =>
          Promise.resolve({ sessionId, status: 'initializing' }),
        );

      await service.onModuleInit();

      expect(mockFind).toHaveBeenCalledWith({ status: 'ready' });
      expect(startSessionSpy).toHaveBeenCalledWith(sessionId);
    });

    it('deve capturar erro se startSession falhar', async () => {
      const sessionId = 'error-session';

      mockFind.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([
            { sessionId, status: 'ready' } as WhatsAppSession,
          ]),
      });

      const error = new Error('simulated error');

      jest.spyOn(service, 'startSession').mockRejectedValue(error);

      await service.onModuleInit();

      expect(mockFind).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('deve enviar mensagem com sucesso', async () => {
      const sessionId = 'valid-session';
      const number = '+55 61 9501-0011';
      const message = 'Olá!';
      const formattedNumber = '556195010011@c.us';

      const mockSendMessage = jest.fn().mockResolvedValue({
        id: { id: 'MSG123' },
      });

      const mockClient = {
        sendMessage: mockSendMessage,
      };

      service['sessions'].set(sessionId, mockClient as unknown as Client);

      const result = await service.sendMessage(sessionId, number, message);

      expect(mockSendMessage).toHaveBeenCalledWith(formattedNumber, message);
      expect(result).toEqual({ status: 'success', messageId: 'MSG123' });
    });

    it('deve retornar erro se a sessão não existir', async () => {
      const result = await service.sendMessage(
        'invalid-session',
        '+55 61 9501-0011',
        'Olá!',
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Sessão invalid-session não está ativa.');
    });

    it('deve capturar erro ao enviar mensagem', async () => {
      const sessionId = 'erro-session';
      const number = '+55 61 9501-0011';
      const message = 'Oi!';

      const mockSendMessage = jest
        .fn()
        .mockRejectedValue(new Error('falha no envio'));

      const mockClient = {
        sendMessage: mockSendMessage,
      };

      service['sessions'].set(sessionId, mockClient as unknown as Client);

      const result = await service.sendMessage(sessionId, number, message);

      expect(result.status).toBe('error');
      expect(result.error).toContain('falha no envio');
    });
  });
});
