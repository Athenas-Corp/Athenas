import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketModule } from 'src/socket/socket.module';
import { RedisModule } from 'src/redis/redis.module';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from 'src/models/schemas/WhatsAppSchema/session.schema';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsApp.gateway';
import { WhatsAppService } from './whatsapp.service';
import { EventsService } from './events.service';
import { EmiteQrEventUseCase } from './useCases/emit-qr-event.usecase';
import { OnReadyUseCase } from './useCases/onready.usecase';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    SocketModule,
    RedisModule,
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
