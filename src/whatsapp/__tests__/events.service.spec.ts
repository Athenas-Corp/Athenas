import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../events.service';
import { EmiteQrEventUseCase } from '../useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from '../useCases/onready.usecase';
import { RedisService } from '../../redis/redis.service';
import { MessageService } from '../../message/message.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { Client, Message } from 'whatsapp-web.js';

type ReadyCallback = () => Promise<void>;
type QrCallback = (qr: string) => Promise<void>;
type MessageCallback = (message: Message) => void;
type AuthenticatedCallback = () => void;
type DisconnectedCallback = (reason: string) => void;
type AuthFailureCallback = (msg: string) => void;
type ChangeStateCallback = (state: string) => void;

interface MockClientType extends Partial<Client> {
  readyCallback?: ReadyCallback;
  qrCallback?: QrCallback;
  messageCallback?: MessageCallback;
  authenticatedCallback?: AuthenticatedCallback;
  disconnectedCallback?: DisconnectedCallback;
  authFailureCallback?: AuthFailureCallback;
  changeStateCallback?: ChangeStateCallback;
  initialize?: jest.Mock;
  destroy?: jest.Mock;
  on?: jest.Mock;
}

describe('EventsService', () => {
  let service: EventsService;
  let emiteQrEventUseCase: jest.Mocked<EmiteQrEventUseCase>;
  let onReadyUseCase: jest.Mocked<OnReadyUseCase>;
  let redisService: jest.Mocked<RedisService>;
  let messageService: jest.Mocked<MessageService>;
  let socketGateway: jest.Mocked<SocketGateway>;
  let mockClient: MockClientType;

  beforeEach(async () => {
    // Cria mock do client
    mockClient = {
      initialize: jest.fn(),
      destroy: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(function (
        this: MockClientType,
        event: string,
        callback: (...args: unknown[]) => void,
      ) {
        if (event === 'ready') this.readyCallback = callback as ReadyCallback;
        if (event === 'qr') this.qrCallback = callback as QrCallback;
        if (event === 'message_create')
          this.messageCallback = callback as MessageCallback;
        if (event === 'authenticated')
          this.authenticatedCallback = callback as AuthenticatedCallback;
        if (event === 'disconnected')
          this.disconnectedCallback = callback as DisconnectedCallback;
        if (event === 'auth_failure')
          this.authFailureCallback = callback as AuthFailureCallback;
        if (event === 'change_state')
          this.changeStateCallback = callback as ChangeStateCallback;
        return this as Client;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EmiteQrEventUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: OnReadyUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RedisService,
          useValue: {
            deleteSession: jest.fn().mockResolvedValue(undefined),
            saveSession: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MessageService,
          useValue: { createMessage: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: SocketGateway,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    emiteQrEventUseCase = module.get(EmiteQrEventUseCase);
    onReadyUseCase = module.get(OnReadyUseCase);
    redisService = module.get(RedisService);
    messageService = module.get(MessageService);
    socketGateway = module.get(SocketGateway);

    jest.clearAllMocks();
  });

  describe('onReady', () => {
    it('deve configurar listener do evento ready e executar OnReadyUseCase com sucesso', async () => {
      // Spies
      const spyOnReady = jest.spyOn(onReadyUseCase, 'execute');
      const spySaveSession = jest.spyOn(redisService, 'saveSession');
      const spySocketEmit = jest.spyOn(socketGateway, 'emit');

      // Inicializa o evento
      service.onReady(mockClient as Client, 'TestClient');

      // Verifica que o listener foi registrado
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));

      // Simula o disparo do evento ready
      if (mockClient.readyCallback) {
        await mockClient.readyCallback();
        // Aguarda um tick adicional para garantir que todas as operações assíncronas sejam concluídas
        await new Promise((resolve) => setImmediate(resolve));
      }

      // Asserções
      expect(spyOnReady).toHaveBeenCalledWith(
        mockClient as Client,
        'TestClient',
      );

      expect(spySaveSession).toHaveBeenCalledWith(
        'TestClient',
        expect.objectContaining({
          clientName: 'TestClient',
          status: 'connected',
          connectionAttempts: 0,
        }),
      );

      expect(spySocketEmit).toHaveBeenCalledWith('client-ready', {
        clientName: 'TestClient',
      });
    });
  });

  //aqui

  describe('onQr', () => {
    it('deve destruir o client quando limite de QR for atingido', async () => {
      emiteQrEventUseCase.execute.mockResolvedValue(true);

      const spyQr = jest.spyOn(emiteQrEventUseCase, 'execute');
      mockClient.destroy = jest.fn(); // garante que destroy é mock
      const spyDestroy = jest.spyOn(mockClient, 'destroy');
      const spyDelete = jest.spyOn(redisService, 'deleteSession');
      const spyLogger = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      // Registra evento QR
      service.onQr(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith('qr', expect.any(Function));

      // Simula o disparo do evento QR
      await mockClient.qrCallback?.('FAKE_QR_CODE');

      // Aguarda próxima execução assíncrona se necessário
      await new Promise((resolve) => setImmediate(resolve));

      expect(spyQr).toHaveBeenCalledWith('FAKE_QR_CODE', 'TestClient');
      expect(spyDelete).toHaveBeenCalledWith('TestClient');
      expect(spyDestroy).toHaveBeenCalled();
      expect(spyLogger).toHaveBeenCalledWith(
        'Cliente TestClient destruído após limite de QR Codes.',
      );
    });

    it('não deve destruir o client quando limite de QR não for atingido', async () => {
      emiteQrEventUseCase.execute.mockResolvedValue(false);
      const spyDelete = jest.spyOn(redisService, 'deleteSession');
      const spyDestroy = jest.spyOn(mockClient, 'destroy');

      service.onQr(mockClient as Client, 'TestClient');

      await mockClient.qrCallback?.('FAKE_QR_CODE');

      expect(spyDelete).not.toHaveBeenCalled();
      expect(spyDestroy).not.toHaveBeenCalled();
    });

    it('deve tratar erro durante processamento do QR', async () => {
      const error = new Error('Erro no processamento QR');
      emiteQrEventUseCase.execute.mockRejectedValue(error);
      const spyLogger = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      service.onQr(mockClient as Client, 'TestClient');

      await mockClient.qrCallback?.('FAKE_QR_CODE');

      expect(spyLogger).toHaveBeenCalledWith(
        'Erro ao processar QR para TestClient:',
        error,
      );
    });
  });

  describe('onMessageCreate', () => {
    it('deve configurar listener do evento message_create e salvar mensagem', async () => {
      const mockMessage: Message = {
        from: '5511999999999@c.us',
        to: '5511888888888@c.us',
        body: 'Olá mundo',
        id: { _serialized: 'msg_123456' },
      } as Message;

      const spyCreateMessage = jest.spyOn(messageService, 'createMessage');
      const spySocketEmit = jest.spyOn(socketGateway, 'emit');
      const spyLogger = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      service.onMessageCreate(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'message_create',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.messageCallback?.(mockMessage);

      // Aguarda operações assíncronas
      await new Promise((resolve) => setImmediate(resolve));

      const expectedMessage = {
        from: '5511999999999@c.us',
        to: '5511888888888@c.us',
        content: 'Olá mundo',
        status: 'received',
        messageId: 'msg_123456',
      };

      expect(spyLogger).toHaveBeenCalledWith(
        'Mensagem recebida do cliente TestClient | De: 5511999999999@c.us | Conteúdo: Olá mundo',
      );
      expect(spyCreateMessage).toHaveBeenCalledWith(expectedMessage);
      expect(spySocketEmit).toHaveBeenCalledWith('newMessage', expectedMessage);
    });
  });

  describe('onAuthenticated', () => {
    it('deve configurar listener do evento authenticated', () => {
      const spyLogger = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      service.onAuthenticated(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'authenticated',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.authenticatedCallback?.();

      expect(spyLogger).toHaveBeenCalledWith(
        'Cliente TestClient autenticado com sucesso!',
      );
    });
  });

  describe('onDisconnected', () => {
    it('deve configurar listener do evento disconnected', () => {
      const spyLogger = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      service.onDisconnected(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.disconnectedCallback?.('NAVIGATION');

      expect(spyLogger).toHaveBeenCalledWith(
        'Cliente TestClient desconectado: NAVIGATION',
      );
    });
  });

  describe('onAuthFailure', () => {
    it('deve configurar listener do evento auth_failure', () => {
      const spyLogger = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      service.onAuthFailure(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'auth_failure',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.authFailureCallback?.('Authentication failed');

      expect(spyLogger).toHaveBeenCalledWith(
        'Falha na autenticação do TestClient: Authentication failed',
      );
    });

    it('deve configurar listener do evento auth_failure com mensagem vazia', () => {
      const spyLogger = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      service.onAuthFailure(mockClient as Client, 'TestClient');

      // Simula o disparo do evento sem mensagem
      mockClient.authFailureCallback?.('');

      expect(spyLogger).toHaveBeenCalledWith(
        'Falha na autenticação do TestClient: Authentication failed',
      );
    });
  });

  describe('onChangeState', () => {
    it('deve configurar listener do evento change_state', () => {
      const spyLogger = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      service.onChangeState(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'change_state',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.changeStateCallback?.('CONNECTED');

      expect(spyLogger).toHaveBeenCalledWith(
        'Estado do client TestClient mudou: CONNECTED',
      );
    });
  });

  describe('activeClients Map', () => {
    it('deve adicionar client ao Map após evento ready', async () => {
      service.onReady(mockClient as Client, 'TestClient');

      await mockClient.readyCallback?.();

      // Verifica se o client foi adicionado ao Map interno (através de reflection)
      const activeClients = service['activeClients'];
      expect(activeClients.has('TestClient')).toBe(true);
      expect(activeClients.get('TestClient')).toBe(mockClient);
    });
  });
});
