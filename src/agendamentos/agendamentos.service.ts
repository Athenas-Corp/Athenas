import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Agendamento,
  AgendamentoDocument,
} from 'src/models/schemas/AgendamentosSchema/agendamentos.schema';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';

@Injectable()
export class AgendamentosService {
  constructor(
    @InjectQueue('agendamentos') private readonly agendamentosQueue: Queue,
    @InjectModel(Agendamento.name)
    private readonly agendamentosModel: Model<AgendamentoDocument>,
  ) {}

  async criarAgendamento(
    createAgendamentoDto: CreateAgendamentoDto,
  ): Promise<{ message: string }> {
    const dataExecucao = new Date(createAgendamentoDto.dataExecucao);

    if (isNaN(dataExecucao.getTime())) {
      throw new BadRequestException('Data de execução inválida');
    }

    const novoAgendamento = new this.agendamentosModel({
      remetente: createAgendamentoDto.remetente,
      destinatarios: createAgendamentoDto.destinatarios,
      mensagem: createAgendamentoDto.mensagem,
      status: 'pendente',
      dataExecucao,
    });

    const doc = await novoAgendamento.save();

    await this.agendamentosQueue.add('enviar-mensagem', doc, {
      delay: dataExecucao.getTime() - Date.now(),
      attempts: 3,
    });

    return { message: 'Agendamento criado com sucesso' };
  }
}
