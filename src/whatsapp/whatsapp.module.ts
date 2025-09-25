import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsApp.gateway';
import { WhatsAppService } from './whatsapp.service';
import { EventsService } from './events.service';
import { EmiteQrEventUseCase } from './useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from './useCases/onready.usecase';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from '../models/schemas/WhatsAppSchema/session.schema';
import { SocketModule } from '../socket/socket.module';
import { RedisModule } from '../redis/redis.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    SocketModule,
    RedisModule,
    MessageModule,
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppGateway,
    EventsService,
    EmiteQrEventUseCase,
    OnReadyUseCase,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
