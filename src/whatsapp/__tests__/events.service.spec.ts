import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../events.service';
import { EmiteQrEventUseCase } from '../useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from '../useCases/onready.usecase';
import { RedisService } from '../../redis/redis.service';
import { MessageService } from '../../message/message.service';
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
          useValue: { execute: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { deleteSession: jest.fn() },
        },
        {
          provide: MessageService,
          useValue: { createMessage: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    emiteQrEventUseCase = module.get(EmiteQrEventUseCase);
    onReadyUseCase = module.get(OnReadyUseCase);
    redisService = module.get(RedisService);
    messageService = module.get(MessageService);

    jest.clearAllMocks();
  });

  describe('onReady', () => {
    it('deve configurar listener do evento ready e executar OnReadyUseCase', async () => {
      const spyReady = jest.spyOn(onReadyUseCase, 'execute');

      service.onReady(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));

      // Simula o disparo do evento
      await mockClient.readyCallback?.();

      expect(spyReady).toHaveBeenCalledWith(mockClient as Client, 'TestClient');
    });
  });

  describe('onQr', () => {
    it('deve destruir o client quando limite de QR for atingido', async () => {
      emiteQrEventUseCase.execute.mockResolvedValue(true);
      const spyQr = jest.spyOn(emiteQrEventUseCase, 'execute');
      const spyDelete = jest.spyOn(redisService, 'deleteSession');
      const spyDestroy = jest.spyOn(mockClient, 'destroy');

      service.onQr(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith('qr', expect.any(Function));

      // Simula o disparo do evento QR e aguarda a execução assíncrona
      await mockClient.qrCallback?.('FAKE_QR_CODE');

      // Aguarda um tick para garantir que as operações assíncronas sejam executadas
      await new Promise((resolve) => setImmediate(resolve));

      expect(spyQr).toHaveBeenCalledWith('FAKE_QR_CODE', 'TestClient');
      expect(spyDelete).toHaveBeenCalledWith('TestClient');
      expect(spyDestroy).toHaveBeenCalled();
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
  });

  describe('onMessageCreate', () => {
    it('deve configurar listener do evento message_create e salvar mensagem', () => {
      const mockMessage: Message = {
        from: '5511999999999@c.us',
        to: '5511888888888@c.us',
        body: 'Olá mundo',
        id: { _serialized: 'msg_123456' },
      } as Message;

      const spyCreateMessage = jest.spyOn(messageService, 'createMessage');

      service.onMessageCreate(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'message_create',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.messageCallback?.(mockMessage);

      expect(spyCreateMessage).toHaveBeenCalledWith({
        from: '5511999999999@c.us',
        to: '5511888888888@c.us',
        content: 'Olá mundo',
        status: 'received',
        messageId: 'msg_123456',
      });
    });
  });

  describe('onAuthenticated', () => {
    it('deve configurar listener do evento authenticated', () => {
      service.onAuthenticated(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'authenticated',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.authenticatedCallback?.();

      // Não há comportamento específico além do log, então apenas verificamos se o listener foi configurado
    });
  });

  describe('onDisconnected', () => {
    it('deve configurar listener do evento disconnected', () => {
      service.onDisconnected(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.disconnectedCallback?.('NAVIGATION');
    });
  });

  describe('onAuthFailure', () => {
    it('deve configurar listener do evento auth_failure', () => {
      service.onAuthFailure(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'auth_failure',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.authFailureCallback?.('Authentication failed');
    });
  });

  describe('onChangeState', () => {
    it('deve configurar listener do evento change_state', () => {
      service.onChangeState(mockClient as Client, 'TestClient');

      expect(mockClient.on).toHaveBeenCalledWith(
        'change_state',
        expect.any(Function),
      );

      // Simula o disparo do evento
      mockClient.changeStateCallback?.('CONNECTED');
    });
  });
});
