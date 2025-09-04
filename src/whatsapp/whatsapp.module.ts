import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppService } from '../whatsapp.service';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from '../../models/schemas/WhatsAppSchema/session.schema';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { WhatsAppGateway } from '../controllers/whatsApp.gateway';
import { SocketModule } from 'src/socket/socket.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventsModule } from 'src/events/events.module';

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
