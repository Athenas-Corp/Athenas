import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WhatsAppSessionDocument = WhatsAppSession & Document;

@Schema({ timestamps: true })
export class WhatsAppSession {
  @Prop({ required: true })
  sessionId: string;

  @Prop()
  status: string;

  @Prop({ type: Object })
  data?: Record<string, string>; //mexi aqui
}

export const WhatsAppSessionSchema =
  SchemaFactory.createForClass(WhatsAppSession);
