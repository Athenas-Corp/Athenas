import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppClientFactory } from '../../infrastructure/whatsapp-client.factory';
import { Client } from 'whatsapp-web.js';
import { WhatsAppService } from './whats-app.service';
import { WhatsAppEventHandler } from './whatsapp-event-handle.service';

// Classe mock para evitar warnings do ESLint sobre métodos não vinculados
class MockClient {
  on = jest.fn();
  initialize = jest.fn();
  // se precisar de outros métodos, adicione aqui como arrow functions
}

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  // Instância mock do Client usando a classe MockClient
  const mockClientInstance = new MockClient() as unknown as jest.Mocked<Client>;

  // Mock do factory que cria o Client
  const mockClientFactory = {
    create: jest.fn(() => mockClientInstance),
  };

  // Mock do EventHandler que registra eventos
  const mockEventHandler = {
    registerEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: WhatsAppClientFactory, useValue: mockClientFactory },
        { provide: WhatsAppEventHandler, useValue: mockEventHandler },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start a new session and register events', async () => {
    mockClientInstance.initialize.mockResolvedValue(undefined);

    await service.startSession('arthur');

    expect(mockClientFactory.create).toHaveBeenCalledWith('arthur');
    expect(mockEventHandler.registerEvents).toHaveBeenCalledWith(
      mockClientInstance,
      'arthur',
      expect.any(Function), // callback onDisconnect
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockClientInstance.initialize).toHaveBeenCalled();
    expect(service.listSessions()).toContain('arthur');
  });

  it('should not start session if already exists', async () => {
    mockClientInstance.initialize.mockResolvedValue(undefined);
    await service.startSession('arthur'); // primeira criação

    // Spy no logger.warn para capturar mensagem de sessão ativa
    const loggerWarnSpy = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => {});

    await service.startSession('arthur'); // tenta criar de novo

    expect(mockClientFactory.create).toHaveBeenCalledTimes(1); // só criou uma vez
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Sessão "arthur" já está ativa.',
    );

    loggerWarnSpy.mockRestore();
  });

  it('should handle error during initialization', async () => {
    const error = new Error('Fail init');
    mockClientInstance.initialize.mockRejectedValue(error);

    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => {});

    await service.startSession('fail-session');

    // Ajuste aqui: o logger recebe uma única string concatenada, não múltiplos args
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Erro ao inicializar sessão "fail-session": ${error.message}`,
    );
  });
});
