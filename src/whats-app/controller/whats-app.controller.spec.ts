import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from './whats-app.controller';
import { WhatsAppService } from '../application/services/whats-app.service';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let service: WhatsAppService;

  // Mock do serviço com startSession retornando Promise resolvida
  const mockService = {
    startSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [{ provide: WhatsAppService, useValue: mockService }],
    }).compile();

    controller = module.get<WhatsAppController>(WhatsAppController);
    service = module.get<WhatsAppService>(WhatsAppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call startSession with sessionId', async () => {
    // Chama o método do controller
    await controller.startSession('arthur');

    // Verifica se o mock do serviço foi chamado com 'arthur'
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(service.startSession).toHaveBeenCalledWith('arthur');
  });
});
