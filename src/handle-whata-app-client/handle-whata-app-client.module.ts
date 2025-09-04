import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HandleWhatsAppClient } from './handle-whata-app-client.service';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from '../models/schemas/WhatsAppSchema/session.schema';
import { SocketModule } from '../socket/socket.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
    SocketModule,
    RedisModule,
  ],
  providers: [HandleWhatsAppClient],
  exports: [HandleWhatsAppClient],
})
export class HandleWhatsAppClientModule {}
