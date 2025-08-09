import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhatsAppService } from 'src/whatsapp/services/whatsapp.service';
import {
  Agendamento,
  AgendamentoDocument,
} from 'src/models/schemas/AgendamentosSchema/agendamentos.schema';

@Processor('agendamentos')
export class AgendamentosProcessor {
  private readonly logger = new Logger(AgendamentosProcessor.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    @InjectModel(Agendamento.name)
    private readonly agendamentosModel: Model<AgendamentoDocument>,
  ) {}

  @Process('enviar-mensagem')
  async handleEnviarMensagem(job: Job<AgendamentoDocument>): Promise<void> {
    const ag = job.data;
    const id = ag._id ? ag._id.toString() : 'id-indefinido';

    this.logger.log(`Processando job id ${job.id} para agendamento ${id}`);

    try {
      for (const numero of ag.destinatarios) {
        this.logger.log(`Enviando mensagem para ${numero}`);
        const resultado = await this.whatsAppService.sendMessage(
          ag.remetente,
          numero,
          ag.mensagem,
        );

        if (resultado.status !== 'success') {
          this.logger.error(
            `Erro ao enviar para ${numero} no agendamento ${id}: ${resultado.error}`,
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
    } catch (error) {
      this.logger.error(
        `Erro ao processar agendamento ${id}: ${error instanceof Error ? error.message : error}`,
      );
      await this.agendamentosModel.updateOne(
        { _id: ag._id },
        { status: 'erro' },
      );
    }
  }
}
