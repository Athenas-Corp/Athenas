import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { AgendamentosService } from '../agendamentos.service';
import { Agendamento } from '../../models/schemas/AgendamentosSchema/agendamentos.schema';

describe('AgendamentosService', () => {
  let service: AgendamentosService;
  let agendamentosQueueMock: { add: jest.Mock };
  let agendamentosModelMock: { save: jest.Mock };

  beforeEach(async () => {
    agendamentosQueueMock = { add: jest.fn() };

    agendamentosModelMock = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentosService,
        {
          provide: getQueueToken('agendamentos'),
          useValue: agendamentosQueueMock,
        },
        {
          provide: getModelToken(Agendamento.name),
          useValue: jest.fn().mockImplementation(() => agendamentosModelMock),
        },
      ],
    }).compile();

    service = module.get<AgendamentosService>(AgendamentosService);
  });

  it('deve criar um agendamento com sucesso', async () => {
    const dto = {
      remetente: 'João',
      destinatarios: ['maria@example.com'],
      mensagem: 'Oi!',
      dataExecucao: new Date(Date.now() + 1000).toISOString(),
    };

    agendamentosModelMock.save.mockResolvedValue({ _id: '1', ...dto });

    const result = await service.criarAgendamento(dto);

    expect(result).toEqual({ message: 'Agendamento criado com sucesso' });
    expect(agendamentosModelMock.save).toHaveBeenCalledTimes(1);
    expect(agendamentosQueueMock.add).toHaveBeenCalledWith(
      'enviar-mensagem',
      expect.any(Object),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('deve lançar erro para data inválida', async () => {
    const dto = {
      remetente: 'João',
      destinatarios: ['maria@example.com'],
      mensagem: 'Oi!',
      dataExecucao: 'data-errada',
    };

    await expect(service.criarAgendamento(dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(agendamentosModelMock.save).not.toHaveBeenCalled();
    expect(agendamentosQueueMock.add).not.toHaveBeenCalled();
  });
});
