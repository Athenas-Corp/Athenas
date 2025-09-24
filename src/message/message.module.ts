import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageService } from './message.service';
import {
  Message,
  MessageSchema,
} from 'src/models/schemas/messageSchema/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema }, // 👈 aqui está o ajuste
    ]),
  ],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
