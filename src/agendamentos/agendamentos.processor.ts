import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhatsAppService } from '../whatsapp/services/whatsapp.service';
import { Agendamento } from '../models/schemas/AgendamentosSchema/agendamentos.schema';

@Processor('agendamentos')
export class AgendamentosProcessor {
  private readonly logger = new Logger(AgendamentosProcessor.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    @InjectModel(Agendamento.name)
    private readonly agendamentosModel: Model<Agendamento>,
  ) {}

  @Process('enviar-mensagem')
  async handleEnviarMensagem(job: Job<Agendamento>): Promise<void> {
    const ag = job.data as Agendamento & { _id?: Types.ObjectId | string };

    const id =
      ag && ag._id
        ? typeof ag._id === 'string'
          ? ag._id
          : ag._id.toString()
        : 'id-indefinido';

    this.logger.log(`Processando job id ${job.id} para agendamento ${id}`);

    try {
      if (!Array.isArray(ag.destinatarios) || ag.destinatarios.length === 0) {
        this.logger.warn(`Agendamento ${id} não possui destinatários.`);
        return;
      }

      for (const numero of ag.destinatarios) {
        this.logger.log(`Enviando mensagem para ${numero}`);

        const resultado = await this.whatsAppService.sendMessage(
          ag.remetente,
          numero,
          ag.mensagem,
        );

        if (resultado.status !== 'success') {
          this.logger.error(
            `Erro ao enviar para ${numero} no agendamento ${id}: ${
              resultado.error ?? 'Erro desconhecido'
            }`,
          );
        } else {
          this.logger.log(
            `Mensagem enviada para ${numero} no agendamento ${id}`,
          );
        }
      }

      await this.agendamentosModel.updateOne(
        { _id: ag._id },
        { status: 'enviado' },
      );

      this.logger.log(`Agendamento ${id} marcado como enviado.`);
    } catch (error: unknown) {
      this.logger.error(
        `Erro ao processar agendamento ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      await this.agendamentosModel.updateOne(
        { _id: ag._id },
        { status: 'erro' },
      );
    }
  }
}
