import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppService } from '../services/whatsapp.service';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from '../../models/schemas/WhatsAppSchema/session.schema';
import { WhatsAppController } from '../controllers/whatsapp.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
    ]),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
