import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agendamento } from '../../models/schemas/AgendamentosSchema/agendamentos.schema';
import { AgendamentosProcessor } from '../agendamentos.processor';
import { Job } from 'bull';

interface AgendamentoJobData {
  _id: string;
  destinatarios: string[];
  remetente: string;
  mensagem: string;
  status: string;
  dataExecucao: Date;
}

describe('AgendamentosProcessor', () => {
  let processor: AgendamentosProcessor;
  let whatsAppService: Partial<WhatsAppService>;
  let agendamentosModel: Partial<Model<Agendamento>>;

  beforeEach(async () => {
    whatsAppService = {
      sendMessage: jest.fn(),
    };

    agendamentosModel = {
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentosProcessor,
        { provide: WhatsAppService, useValue: whatsAppService },
        {
          provide: getModelToken(Agendamento.name),
          useValue: agendamentosModel,
        },
      ],
    }).compile();

    processor = module.get<AgendamentosProcessor>(AgendamentosProcessor);
  });

  it('deve enviar mensagens para todos os destinatários e marcar como enviado', async () => {
    const jobData: AgendamentoJobData = {
      _id: '123',
      destinatarios: ['5511999999999', '5511888888888'],
      remetente: 'sessao1',
      mensagem: 'Teste',
      status: 'pendente',
      dataExecucao: new Date(),
    };

    (whatsAppService.sendMessage as jest.Mock).mockResolvedValue({
      status: 'success',
    });
    (agendamentosModel.updateOne as jest.Mock).mockResolvedValue({});

    const mockJob: Partial<Job<AgendamentoJobData>> = {
      data: jobData,
      id: 'job1',
    };

    await processor.handleEnviarMensagem(mockJob as Job<AgendamentoJobData>);

    expect(whatsAppService.sendMessage).toHaveBeenCalledTimes(2);
    expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
      jobData.remetente,
      jobData.destinatarios[0],
      jobData.mensagem,
    );
    expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
      jobData.remetente,
      jobData.destinatarios[1],
      jobData.mensagem,
    );
    expect(agendamentosModel.updateOne).toHaveBeenCalledWith(
      { _id: jobData._id },
      { status: 'enviado' },
    );
  });

  it('não deve enviar mensagens se não houver destinatários', async () => {
    const jobData: AgendamentoJobData = {
      _id: '456',
      destinatarios: [],
      remetente: 'sessao1',
      mensagem: 'Teste vazio',
      status: 'pendente',
      dataExecucao: new Date(),
    };

    const mockJob: Partial<Job<AgendamentoJobData>> = {
      data: jobData,
      id: 'job2',
    };

    await processor.handleEnviarMensagem(mockJob as Job<AgendamentoJobData>);

    expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    expect(agendamentosModel.updateOne).not.toHaveBeenCalled();
  });
});
