import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketModule } from 'src/socket/socket.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventsModule } from 'src/events/events.module';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from 'src/models/schemas/WhatsAppSchema/session.schema';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsApp.gateway';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    SocketModule,
    RedisModule,
    EventsModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppGateway],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
