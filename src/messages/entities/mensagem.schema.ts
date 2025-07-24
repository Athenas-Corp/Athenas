import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Mensagem extends Document {
  @Prop({ required: true })
  texto: string;

  @Prop({ default: Date.now })
  criadoEm: Date;
}

export const MensagemSchema = SchemaFactory.createForClass(Mensagem);
