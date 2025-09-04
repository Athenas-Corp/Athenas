import { Test, TestingModule } from '@nestjs/testing';
import { HandleWhatsAppClient } from '../../handle-whata-app-client/handle-whata-app-client.service';
import { Client } from 'whatsapp-web.js';
import { EventsService } from '../events.service';

describe('EventsService', () => {
  let service: EventsService;

  // Tipos para callbacks
  type ReadyCallback = () => Promise<void>;
  type QrCallback = (qr: string) => void;

  // Mock do HandleWhatsAppClient
  const mockHandleWhatsAppClient: Pick<
    HandleWhatsAppClient,
    'handleReady' | 'handleQr'
  > = {
    handleReady: jest.fn<Promise<void>, [Client, string]>(),
    handleQr: jest.fn<void, [string]>(),
  };

  // Mock do Client com callbacks armazenados
  interface MockClientType extends Partial<Client> {
    readyCallback?: ReadyCallback;
    qrCallback?: QrCallback;
  }

  const mockClient: MockClientType = {
    initialize: jest.fn<Promise<void>, []>(),
    on: jest.fn(function (
      this: MockClientType,
      event: string,
      callback: (...args: unknown[]) => void,
    ) {
      if (event === 'ready') this.readyCallback = callback as ReadyCallback;
      if (event === 'qr') this.qrCallback = callback as QrCallback;
      return this as Client; // Retorna o Client real, conforme a assinatura original
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: HandleWhatsAppClient, useValue: mockHandleWhatsAppClient },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should register events, initialize client, and call handleReady & handleQr', async () => {
    await service.registerClientEvents(mockClient as Client, 'TestClient');

    // Verifica inicialização
    expect(mockClient.initialize).toHaveBeenCalled();

    // Verifica que on foi chamado (registro de eventos)
    expect(mockClient.on).toHaveBeenCalled();

    // Dispara manualmente os callbacks de forma segura
    const readyCallback = mockClient.readyCallback!;
    await readyCallback();
    expect(mockHandleWhatsAppClient.handleReady).toHaveBeenCalledWith(
      mockClient,
      'TestClient',
    );

    const qrCallback = mockClient.qrCallback!;
    qrCallback('FAKE_QR');
    expect(mockHandleWhatsAppClient.handleQr).toHaveBeenCalledWith('FAKE_QR');
  });
});
