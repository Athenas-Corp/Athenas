import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Agendamento {
  @Prop()
  remetente: string;

  @Prop([String])
  destinatarios: string[];

  @Prop()
  mensagem: string;

  @Prop({ default: 'pendente' })
  status: string;

  @Prop({ required: true })
  dataExecucao: Date;
}

// cria o schema para o Mongoose
export const AgendamentoSchema = SchemaFactory.createForClass(Agendamento);
