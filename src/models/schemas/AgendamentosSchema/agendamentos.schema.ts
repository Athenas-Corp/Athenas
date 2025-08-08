import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

// tipo do documento com _id tipado como ObjectId
export type AgendamentoDocument = Agendamento & Document<Types.ObjectId>;
