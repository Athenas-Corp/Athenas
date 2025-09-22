import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../events.service';
import { EmiteQrEventUseCase } from '../useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from '../useCases/onready.usecase';
import { RedisService } from '../../redis/redis.service';
import { Client, Message } from 'whatsapp-web.js';

// Tipos para callbacks do mock
type ReadyCallback = () => Promise<void>;
type QrCallback = (qr: string) => Promise<void>;
type MessageCallback = (message: Message) => void;

// Mock do Client com callbacks armazenados
interface MockClientType extends Partial<Client> {
  readyCallback?: ReadyCallback;
  qrCallback?: QrCallback;
  messageCallback?: MessageCallback;
}

describe('EventsService', () => {
  let service: EventsService;
  let emiteQrEventUseCase: jest.Mocked<EmiteQrEventUseCase>;
  let onReadyUseCase: jest.Mocked<OnReadyUseCase>;
  let redisService: jest.Mocked<RedisService>;

  let mockClient: MockClientType;

  beforeEach(async () => {
    // Cria um novo mockClient antes de cada teste
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
        return this as Client;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EmiteQrEventUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(false), // default: limite não atingido
          },
        },
        {
          provide: OnReadyUseCase,
          useValue: {
            execute: jest.fn(), // arrow function evita `this`
          },
        },
        {
          provide: RedisService,
          useValue: {
            deleteSession: jest.fn(), // arrow function evita `this`
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    emiteQrEventUseCase = module.get(EmiteQrEventUseCase);
    onReadyUseCase = module.get(OnReadyUseCase);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('deve registrar eventos e inicializar o client', async () => {
    await service.registerAllEvents(mockClient as Client, 'TestClient');

    expect(mockClient.initialize).toHaveBeenCalled();
    expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('qr', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith(
      'message_create',
      expect.any(Function),
    );
  });

  it('deve executar OnReadyUseCase quando o evento ready for disparado', async () => {
    await service.registerAllEvents(mockClient as Client, 'TestClient');

    await mockClient.readyCallback!();

    await ((): Promise<void> =>
      onReadyUseCase.execute(mockClient as Client, 'TestClient'))();
  });

  it('deve destruir o client quando limite de QR for atingido', async () => {
    // Simula que o useCase retorna true para indicar limite atingido
    emiteQrEventUseCase.execute.mockResolvedValue(true);

    await service.registerAllEvents(mockClient as Client, 'TestClient');

    // Dispara 3 QRs para atingir o limite
    await mockClient.qrCallback?.('FAKE_QR_1');
    await mockClient.qrCallback?.('FAKE_QR_2');
    await mockClient.qrCallback?.('FAKE_QR_3');

    const spyQr = jest.spyOn(emiteQrEventUseCase, 'execute');
    // Verifica se o useCase foi chamado para cada QR
    expect(spyQr).toHaveBeenNthCalledWith(1, 'FAKE_QR_1', 'TestClient');
    expect(spyQr).toHaveBeenNthCalledWith(2, 'FAKE_QR_2', 'TestClient');
    expect(spyQr).toHaveBeenNthCalledWith(3, 'FAKE_QR_3', 'TestClient');

    // Verifica se o redis e destroy foram chamados após o terceiro QR
    const deleteSessionSpy = jest.spyOn(redisService, 'deleteSession');
    expect(deleteSessionSpy).toHaveBeenCalledWith('TestClient');
    expect(mockClient.destroy).toHaveBeenCalled();
  });

  it('não deve destruir o client quando limite de QR não for atingido', async () => {
    // Simula que o limite não é atingido
    emiteQrEventUseCase.execute.mockResolvedValue(false);

    const spyRedis = jest.spyOn(redisService, 'deleteSession');

    await service.registerAllEvents(mockClient as Client, 'TestClient');

    await mockClient.qrCallback?.('FAKE_QR_1');

    expect(spyRedis).not.toHaveBeenCalled();
    expect(mockClient.destroy).not.toHaveBeenCalled();
  });

  it('deve logar mensagem recebida no evento message_create', async () => {
    const message: Message = {
      from: '123',
      body: 'Olá mundo',
    } as Message;

    await service.registerAllEvents(mockClient as Client, 'TestClient');

    // Dispara o evento
    mockClient.messageCallback?.(message);

    expect(mockClient.messageCallback).toBeDefined();
  });
});
