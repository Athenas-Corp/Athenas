import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AgendamentosService } from '../agendamentos.service';
import { BadRequestException } from '@nestjs/common';
import { Agendamento } from '../../models/schemas/AgendamentosSchema/agendamentos.schema';
import { CreateAgendamentoDto } from '../dto/create-agendamento.dto';

// Interface para o mock da fila
interface MockQueue {
  add: jest.Mock<
    Promise<void>,
    [string, Partial<Agendamento>, { delay: number; attempts: number }]
  >;
}

// Interface para o mock do model
interface MockAgendamentoModel {
  new (data: Partial<Agendamento>): Partial<Agendamento> & {
    save: jest.Mock<Promise<Partial<Agendamento>>, []>;
  };
}

describe('AgendamentosService', () => {
  let service: AgendamentosService;
  let mockQueue: MockQueue;
  let mockAgendamentosModel: MockAgendamentoModel;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn<
        Promise<void>,
        [string, Partial<Agendamento>, { delay: number; attempts: number }]
      >(),
    };

    // Depois opcionalmente você pode definir o retorno:
    mockAgendamentosModel = jest
      .fn()
      .mockImplementation((data: Partial<Agendamento>) => ({
        ...data,
        save: jest.fn().mockResolvedValue({
          ...data,
          _id: 'mock-id',
        }),
      }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentosService,
        {
          provide: 'BullQueue_agendamentos', // token gerado pelo @InjectQueue('agendamentos')
          useValue: mockQueue,
        },
        {
          provide: getModelToken(Agendamento.name),
          useValue: mockAgendamentosModel,
        },
      ],
    }).compile();

    service = module.get<AgendamentosService>(AgendamentosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar agendamento com sucesso', async () => {
    const dto: CreateAgendamentoDto = {
      remetente: '123',
      destinatarios: ['456'],
      mensagem: 'Olá',
      dataExecucao: new Date(Date.now() + 1000).toISOString(),
    };

    const result = await service.criarAgendamento(dto);

    expect(result).toEqual({ message: 'Agendamento criado com sucesso' });

    // Verifica se o model foi instanciado corretamente
    expect(mockAgendamentosModel).toHaveBeenCalledWith({
      remetente: dto.remetente,
      destinatarios: dto.destinatarios,
      mensagem: dto.mensagem,
      status: 'pendente',
      dataExecucao: new Date(dto.dataExecucao),
    });

    // Verifica se a fila recebeu o job
    expect(mockQueue.add).toHaveBeenCalledWith(
      'enviar-mensagem',
      expect.objectContaining<Partial<Agendamento>>({
        remetente: dto.remetente,
        mensagem: dto.mensagem,
      }),
      expect.objectContaining<{ delay: number; attempts: number }>({
        delay: expect.any(Number) as number,
        attempts: 3,
      }),
    );
  });

  it('deve lançar erro se a data for inválida', async () => {
    const dto: CreateAgendamentoDto = {
      remetente: '123',
      destinatarios: ['456'],
      mensagem: 'Olá',
      dataExecucao: 'data-invalida', // string inválida proposital
    };

    await expect(service.criarAgendamento(dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
