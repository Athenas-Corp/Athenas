import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Message,
  MessageDocument,
} from '../models/schemas/messageSchema/message.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}
  async createMessage(data: {
    from: string;
    to: string;
    content: string;
    status: string;
    messageId?: string;
  }): Promise<Message> {
    const createdMessage = new this.messageModel(data);
    return createdMessage.save();
  }
}
