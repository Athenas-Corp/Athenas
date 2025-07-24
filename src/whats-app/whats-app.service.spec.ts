import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whats-app.service';
import { Logger } from '@nestjs/common';

jest.mock('whatsapp-web.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
    })),
    LocalAuth: jest.fn(),
  };
});

jest.mock('qrcode-terminal', () => ({
  generate: jest.fn(),
}));

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsAppService],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  it('deve adicionar uma nova sessão', async () => {
    await service.startSession('sessao-teste');

    const sessions = service.listSessions();
    expect(sessions).toContain('sessao-teste');
  });

  it('deve não duplicar sessão se já existe', async () => {
    const loggerWarn = jest.spyOn(Logger.prototype, 'warn');

    await service.startSession('sessao-duplicada');
    await service.startSession('sessao-duplicada');

    const sessions = service.listSessions();
    expect(sessions.filter((s) => s === 'sessao-duplicada').length).toBe(1);
    expect(loggerWarn).toHaveBeenCalledWith(
      'Sessão "sessao-duplicada" já está ativa.',
    );
  });
});
