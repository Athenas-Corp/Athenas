import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../services/whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { Client, Message } from 'whatsapp-web.js';

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    on: jest.fn(),
    sendMessage: jest.fn(),
  })),
  LocalAuth: jest.fn(),
}));

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

  beforeAll(() => {
    jest.useFakeTimers(); // habilita controle de tempo
  });

  afterAll(() => {
    jest.useRealTimers(); // restaura comportamento real
  });

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
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    MockedClient.mockReset();
    service['sessions'].clear();
  });

  describe('enviarRespostaAutomatica', () => {
    let mockMessage: Partial<Message>;

    beforeEach(() => {
      mockMessage = {
        fromMe: false,
        getContact: jest.fn().mockResolvedValue({
          pushname: 'Arthur',
          name: 'Arthur',
        }),
      };
    });

    it('deve enviar mensagem dentro do horário comercial', async () => {
      const mockDate = new Date('2025-08-12T10:00:00-03:00'); // horário comercial
      jest.setSystemTime(mockDate);

      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ status: 'success' });

      const loggerLogSpy = jest.spyOn(service['logger'], 'log');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
        mockMessage as Message,
      );

      expect(sendMessageSpy).toHaveBeenCalledWith(
        'sessao',
        '559999999999',
        'Olá, Arthur! Recebemos sua mensagem e logo entraremos em contato.',
      );
      expect(result.status).toBe('success');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mensagem automática enviada'),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('deve enviar mensagem fora do horário comercial', async () => {
      const mockDate = new Date('2025-08-12T23:00:00Z'); // fora do horário
      jest.setSystemTime(mockDate);

      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ status: 'success' });

      const loggerLogSpy = jest.spyOn(service['logger'], 'log');

      await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
        mockMessage as Message,
      );

      expect(sendMessageSpy).toHaveBeenCalledWith(
        'sessao',
        '559999999999',
        'Olá, Arthur! Estamos fora do nosso horário de atendimento. Retornaremos no próximo dia útil.',
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mensagem automática enviada'),
      );
    });

    it('deve lidar com erro inesperado', async () => {
      jest
        .spyOn(service, 'sendMessage')
        .mockRejectedValue(new Error('falha inesperada'));

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
        mockMessage as Message,
      );

      expect(result.status).toBe('error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Erro inesperado ao enviar mensagem automática: falha inesperada',
        ),
      );
    });

    it('não deve enviar mensagem se já respondeu para o número', async () => {
      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ status: 'success' });

      await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
        mockMessage as Message,
      );

      const result = await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
        mockMessage as Message,
      );

      expect(result.status).toBe('already-sent');
      expect(sendMessageSpy).toHaveBeenCalledTimes(1); // não chamou de novo
    });
  });
});
