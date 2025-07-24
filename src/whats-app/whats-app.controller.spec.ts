import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from './whats-app.controller';
import { WhatsAppService } from './whats-app.service';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let service: Partial<WhatsAppService>; // ✅ evita erro de método unbound

  beforeEach(async () => {
    const mockService: Partial<WhatsAppService> = {
      startSession: jest.fn().mockResolvedValue(undefined),
      listSessions: jest.fn().mockReturnValue(['sessao1']),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        {
          provide: WhatsAppService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<WhatsAppController>(WhatsAppController);
    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call startSession and return status', async () => {
    const sessionId = 'abc123';
    const result = await controller.startSession(sessionId);

    expect(service.startSession).toHaveBeenCalledWith(sessionId); // ✅
    expect(result).toEqual({ status: 'iniciando', sessionId });
  });

  it('should return list of sessions', () => {
    const result = controller.listSessions();
    expect(result).toEqual(['sessao1']);
  });
});
