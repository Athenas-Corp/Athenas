import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'sent' })
  status: string;

  @Prop()
  messageId?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
