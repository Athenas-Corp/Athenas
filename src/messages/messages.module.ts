import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mensagem, MensagemSchema } from './entities/mensagem.schema';
import { MessagesService } from './messagem.service';
import { MessagesController } from './messagem.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Mensagem.name, schema: MensagemSchema },
    ]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
