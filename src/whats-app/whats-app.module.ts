import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppService } from './application/services/whats-app.service';
import { WhatsAppController } from './controller/whats-app.controller';
import { SessionSchema } from './infrastructure/database/session.schema';
import { WhatsAppEventHandler } from './application/services/whatsapp-event-handle.service';
import { WhatsAppClientFactory } from './infrastructure/whatsapp-client.factory';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Session', schema: SessionSchema }]),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppEventHandler, WhatsAppClientFactory],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
