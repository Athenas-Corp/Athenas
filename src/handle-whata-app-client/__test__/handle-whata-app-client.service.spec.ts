import { Test, TestingModule } from '@nestjs/testing';
import { HandleWhatsAppClient } from '../handle-whata-app-client.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { RedisService } from '../../redis/redis.service';
import { Client } from 'whatsapp-web.js';
import { getModelToken } from '@nestjs/mongoose';

describe('HandleWhatsAppClient', () => {
  let service: HandleWhatsAppClient;
  let mockClient: Partial<Client>;

  const mockSessionModel = {
    updateOne: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(undefined),
  };

  const mockSocketGateway = {
    emit: jest.fn(),
  };

  const mockRedisService = {
    saveSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandleWhatsAppClient,
        {
          provide: getModelToken('WhatsAppSession'),
          useValue: mockSessionModel,
        },
        { provide: SocketGateway, useValue: mockSocketGateway },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<HandleWhatsAppClient>(HandleWhatsAppClient);

    mockClient = {} as Partial<Client>;
  });

  it('should handleReady correctly', async () => {
    await service.handleReady(mockClient as Client, 'TestClient');

    expect(mockSessionModel.updateOne).toHaveBeenCalledWith(
      { clientName: 'TestClient' },
      { status: 'connected' },
    );
    expect(mockSessionModel.exec).toHaveBeenCalled();

    expect(mockRedisService.saveSession).toHaveBeenCalledWith(
      'TestClient',
      expect.objectContaining({
        clientName: 'TestClient',
        status: 'connected',
        connectionAttempts: 0,
      }),
    );

    expect(mockSocketGateway.emit).toHaveBeenCalledWith('client-ready', {
      clientName: 'TestClient',
    });

    expect(service.getActiveClient('TestClient')).toBe(mockClient);
  });

  it('getActiveClient should return undefined if client not found', () => {
    expect(service.getActiveClient('Unknown')).toBeUndefined();
  });

  it('handleQr should emit QR code', () => {
    service.handleQr('FAKE_QR');
    expect(mockSocketGateway.emit).toHaveBeenCalledWith('qr-code', {
      qr: 'FAKE_QR',
    });
  });
});
