import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../services/whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { Client } from 'whatsapp-web.js';
import { WhatsAppSession } from '../interfaces/session.interface';

// Mock whatsapp-web.js
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    on: jest.fn(),
    sendMessage: jest.fn(),
  })),
  LocalAuth: jest.fn(),
  Message: jest.fn(),
}));

// Mock qrcode-terminal para não imprimir no teste
jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  const mockUpdateOne = jest.fn();
  const mockFind = jest.fn();
  const mockCreate = jest.fn();

  const mockSessionModel = {
    updateOne: mockUpdateOne,
    find: mockFind,
    create: mockCreate,
  };

  const MockedClient = Client as unknown as jest.MockedClass<typeof Client>;

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
    MockedClient.mockReset();
  });

  describe('onModuleInit', () => {
    it('deve reconectar sessões do banco', async () => {
      const sessions: WhatsAppSession[] = [
        {
          sessionId: 'sessao1',
          status: 'ready',
          sessionData: {
            WABrowserId: 'mock-browser-id',
            WASecretBundle: { keyData: 'mock-key-data' },
            WAToken1: 'mock-token-1',
            WAToken2: 'mock-token-2',
          },
        },
      ];
      mockFind.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sessions),
      });

      const startSessionSpy = jest
        .spyOn(service, 'startSession')
        .mockResolvedValue({ status: 'initializing', sessionId: 'sessao1' });

      await service.onModuleInit();

      expect(mockFind).toHaveBeenCalledWith({ status: 'ready' });
      expect(startSessionSpy).toHaveBeenCalledWith('sessao1', false);
    });

    it('deve logar erro se startSession falhar', async () => {
      const sessions: WhatsAppSession[] = [
        {
          sessionId: 'sessaoErro',
          status: 'ready',
          sessionData: {
            WABrowserId: 'mock-browser-id',
            WASecretBundle: { keyData: 'mock-key-data' },
            WAToken1: 'mock-token-1',
            WAToken2: 'mock-token-2',
          },
        },
      ];
      mockFind.mockReturnValue({
        exec: jest.fn().mockResolvedValue(sessions),
      });

      jest.spyOn(service, 'startSession').mockRejectedValue(new Error('falha'));

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.onModuleInit()).resolves.not.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao reconectar sessão sessaoErro:'),
        expect.any(Error),
      );
    });
  });

  describe('createNewSession', () => {
    it('deve criar e iniciar nova sessão', async () => {
      mockCreate.mockResolvedValue(undefined);

      const startSessionSpy = jest
        .spyOn(service, 'startSession')
        .mockResolvedValue({ status: 'initializing', sessionId: 'cliente1' });

      const sessionId = await service.createNewSession('cliente1');

      expect(mockCreate).toHaveBeenCalledWith({
        sessionId: 'cliente1',
        status: 'pending',
        clientName: 'cliente1',
      });

      expect(startSessionSpy).toHaveBeenCalledWith('cliente1', true);
      expect(sessionId).toBe('cliente1');
    });

    it('deve logar erro ao falhar na criação', async () => {
      mockCreate.mockRejectedValue(new Error('erro ao criar'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const sessionId = await service.createNewSession('clienteErro');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Erro ao criar nova sessão: erro ao criar',
      );
      expect(sessionId).toBe('clienteErro');
    });
  });

  describe('startSession', () => {
    it('deve iniciar nova sessão se não existir', async () => {
      const initializeMock = jest.fn().mockResolvedValue(undefined);
      const onMock = jest.fn();

      MockedClient.mockImplementation(
        () =>
          ({
            initialize: initializeMock,
            on: onMock,
          }) as unknown as Client,
      );

      const result = await service.startSession('sessaoNova', true);

      expect(result).toEqual({
        status: 'initializing',
        sessionId: 'sessaoNova',
      });
      expect(MockedClient).toHaveBeenCalledTimes(1);
      expect(onMock).toHaveBeenCalled();
      expect(initializeMock).toHaveBeenCalled();
    });

    it('deve retornar already-started se sessão existir', async () => {
      service['sessions'].set('sessaoExistente', {} as Client);

      const result = await service.startSession('sessaoExistente');

      expect(result).toEqual({
        status: 'already-started',
        sessionId: 'sessaoExistente',
      });
    });

    it('deve retornar erro se falhar na inicialização', async () => {
      MockedClient.mockImplementation(
        () =>
          ({
            initialize: jest.fn().mockRejectedValue(new Error('falha init')),
            on: jest.fn(),
          }) as unknown as Client,
      );

      const result = await service.startSession('sessaoErro');

      expect(result).toEqual({ status: 'error', sessionId: 'sessaoErro' });
    });
  });

  describe('sendMessage', () => {
    it('deve enviar mensagem com sucesso', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue({
        id: { id: 'msgId123' },
      });

      const mockClient = {
        sendMessage: mockSendMessage,
      } as unknown as Client;

      service['sessions'].set('sessaoMsg', mockClient);

      const result = await service.sendMessage(
        'sessaoMsg',
        '+55 61 9501-0011',
        'Olá',
      );

      expect(mockSendMessage).toHaveBeenCalledWith('556195010011@c.us', 'Olá');
      expect(result).toEqual({ status: 'success', messageId: 'msgId123' });
    });

    it('deve retornar erro se sessão não existir', async () => {
      const result = await service.sendMessage(
        'sessaoInvalida',
        '+55 61 9501-0011',
        'Olá',
      );

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/Sessão sessaoInvalida não está ativa./);
    });

    it('deve retornar erro ao falhar no envio da mensagem', async () => {
      const mockSendMessage = jest
        .fn()
        .mockRejectedValue(new Error('falha no envio'));

      const mockClient = {
        sendMessage: mockSendMessage,
      } as unknown as Client;

      service['sessions'].set('sessaoErro', mockClient);

      const result = await service.sendMessage(
        'sessaoErro',
        '+55 61 9501-0011',
        'Oi',
      );

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/falha no envio/);
    });
  });

  describe('startSession', () => {
    it('deve registrar eventos do client ao iniciar sessão', async () => {
      const onMock = jest.fn();
      const initializeMock = jest.fn().mockResolvedValue(undefined);

      // Mock da implementação do Client para expor on e initialize
      MockedClient.mockImplementation(
        () =>
          ({
            initialize: initializeMock,
            on: onMock,
          }) as unknown as Client,
      );

      const result = await service.startSession('sessaoEvento', true);

      expect(result.status).toBe('initializing');
      expect(onMock).toHaveBeenCalledWith('qr', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith(
        'authenticated',
        expect.any(Function),
      );
      expect(onMock).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
});
