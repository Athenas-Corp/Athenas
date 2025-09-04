import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { HandleWhatsAppClientModule } from 'src/handle-whata-app-client/handle-whata-app-client.module';

@Module({
  imports: [HandleWhatsAppClientModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
