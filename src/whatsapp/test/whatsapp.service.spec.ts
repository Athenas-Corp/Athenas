import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../services/whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { Client } from 'whatsapp-web.js';

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
    it('deve enviar mensagem dentro do horário comercial', async () => {
      const mockDate = new Date('2025-08-12T10:00:00-03:00');

      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockImplementation(() => {
          service['logger'].log('mock sendMessage chamado');
          return Promise.resolve({ status: 'success' });
        });

      const loggerLogSpy = jest.spyOn(service['logger'], 'log');
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
      );

      expect(sendMessageSpy).toHaveBeenCalledWith(
        'sessao',
        '559999999999',
        'Olá! Recebemos sua mensagem e logo entraremos em contato.',
      );
      expect(result.status).toBe('success');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mensagem automática enviada'),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('deve enviar mensagem fora do horário comercial', async () => {
      // Data fora do horário comercial: 12 de agosto de 2025, 23h00 UTC
      const mockDate = new Date('2025-08-12T23:00:00Z');

      // MOCKAR somente Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue({ status: 'success' });

      const loggerLogSpy = jest.spyOn(service['logger'], 'log');

      await service.enviarRespostaAutomatica('sessao', '559999999999');

      expect(sendMessageSpy).toHaveBeenCalledWith(
        'sessao',
        '559999999999',
        service['mensagemForaHorario'], // CORRETO: mensagemForaHorario
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mensagem automática enviada'),
      );

      jest.restoreAllMocks();
    });

    it('deve lidar com erro inesperado', async () => {
      jest
        .spyOn(service, 'sendMessage')
        .mockRejectedValue(new Error('falha inesperada'));
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      const result = await service.enviarRespostaAutomatica(
        'sessao',
        '559999999999',
      );

      expect(result.status).toBe('error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Erro inesperado ao enviar mensagem automática: falha inesperada',
        ),
      );
    });
  });
});
